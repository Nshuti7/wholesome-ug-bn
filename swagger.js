import swaggerJSDoc from "swagger-jsdoc";
import fs from "fs";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Ubuntu Footprints API Docs",
    version: "1.0.0",
    description: "API documentation for Ubuntu Footprints website",
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Local dev server",
    },
    {
      url: "https://api.ubuntufootprints.com/api",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  swaggerDefinition,
  apis: ["./routes/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

fs.writeFileSync("./swagger-output.json", JSON.stringify(swaggerSpec, null, 2));
console.log("Swagger JSON generated.");
