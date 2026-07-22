const dotenv = require("dotenv");
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger-jsdoc-config");
const applySecurity = require("./middleware/security");
const { apiLimiter } = require("./middleware/rateLimiter");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

dotenv.config();
// Route imports
const destinationRoutes = require("./routes/destinations");
const itineraryRoutes = require("./routes/itineraries");
const galleryRoutes = require("./routes/gallery");
const newsletterRoutes = require("./routes/newsletter");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contact");
const dashboardRoutes = require("./routes/dashboard");
const blogRoutes = require("./routes/blog");
const revalidateRoutes = require("./routes/revalidate");
const teamRoutes = require("./routes/team");
const reviewRoutes = require("./routes/reviews");
const bookingRoutes = require("./routes/bookings");
const experienceRoutes = require("./routes/experiences");
const testimonialRoutes = require("./routes/testimonials");
const weatherRoutes = require("./routes/weather");
const healthRoutes = require("./routes/health");
const companyRoutes = require("./routes/company");
const showcaseRoutes = require("./routes/showcase");

app.set("trust proxy", 1);
applySecurity(app);

// IP detection middleware
app.use((req, res, next) => {
  // Get the real client IP
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    req.clientIP = forwarded.split(',')[0].trim();
  } else {
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      req.clientIP = realIP;
    } else {
      req.clientIP = req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
    }
  }
  
  // Remove IPv6 prefix if present
  if (req.clientIP && req.clientIP.startsWith('::ffff:')) {
    req.clientIP = req.clientIP.substring(7);
  }
  
  next();
});

// Security middleware - removes X-Powered-By header
app.use(helmet());



// Middleware
const corsOptions = {
  origin: [process.env.FRONTEND_BASE_URL, process.env.ADMIN_BASE_URL],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Global rate limit on every API route (auth + form routes add stricter caps)
app.use("/api", apiLimiter);
// Don't use urlencoded middleware for multipart form data
// app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB.
// Fail fast on boot: without a database this process can only serve 500s, and a
// container that dies is a deploy that rolls back instead of one that silently
// looks healthy. Drops *after* boot are handled by the lifecycle logging below
// plus the health check, which reports 503 so Docker restarts us.
mongoose.set("strictQuery", false);

if (!process.env.MONGO_URI) {
  console.error("FATAL: MONGO_URI is not set — refusing to start.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("FATAL: initial MongoDB connection failed:", err.message);
    process.exit(1);
  });

// Connection lifecycle — timestamped so a post-mortem shows *when* the link died,
// not just the buffering timeouts that follow it.
const mongoEvent = (msg) => console.log(`[mongo] ${new Date().toISOString()} ${msg}`);
mongoose.connection.on("disconnected", () => mongoEvent("disconnected"));
mongoose.connection.on("reconnected", () => mongoEvent("reconnected"));
mongoose.connection.on("close", () => mongoEvent("connection closed"));
mongoose.connection.on("error", (err) =>
  console.error(`[mongo] ${new Date().toISOString()} error:`, err.message)
);

// Routes
app.use("/api/destinations", destinationRoutes);
app.use("/api/itineraries", itineraryRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/revalidate", revalidateRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/showcase", showcaseRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Ubuntu Footprints API" });
});

// API docs are exposed only outside production to avoid publishing the
// full API surface to the internet.
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/docs-json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, HOST, () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    console.log(
      `Swagger docs available at https://api.ubuntufootprints.com/api-docs`
    );
  } else {
    console.log(`Server running on port ${PORT}`);
  }
});

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Promise Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  server.close(() => process.exit(1));
});
