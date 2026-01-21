# Wholesome Uganda Backend

Production-ready NestJS backend with enterprise-grade security following urban backend patterns.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start MongoDB & Redis
mongod
redis-server

# Run development server
npm run start:dev
```

Visit: http://localhost:3001/api/docs

## 🔒 Security Features

### Authentication & Sessions
- ✅ **Redis Session Management** - Sessions stored in Redis with in-memory fallback
- ✅ **JWT with Refresh Tokens** - Access (15min) + Refresh (7 days) with rotation
- ✅ **Argon2 Password Hashing** - Industry-standard (more secure than bcrypt)
- ✅ **OTP Email System** - Rate-limited, with cooldown and account lock
- ✅ **Multi-device Logout** - Logout from all devices
- ✅ **Session Validation** - Every request validates Redis session

### Request Security
- ✅ **Helmet** - Security headers (XSS, clickjacking, CSP)
- ✅ **XSS Protection** - xss-clean sanitization
- ✅ **NoSQL Injection Protection** - express-mongo-sanitize
- ✅ **HTTP Parameter Pollution** - hpp protection
- ✅ **Rate Limiting** - Throttler middleware
- ✅ **Input Validation** - class-validator on all DTOs

### File Upload Security
- ✅ **Cloudinary Integration** - Direct upload, no local storage
- ✅ **File Type Validation** - Only images (JPEG, PNG, WebP, SVG)
- ✅ **File Size Limits** - 5MB maximum
- ✅ **Automatic Optimization** - Cloudinary auto-optimization

## 📦 Features

### Auth Module
- Register/Login with Redis session management
- Profile management
- Password change
- OTP-based password reset (forgot → verify → reset)
- Refresh token rotation
- Logout (single & all devices)

### Content Modules
- Blog (with Cloudinary image upload)
- Gallery (with Cloudinary)
- Services
- Contact form submissions
- Newsletter subscriptions

## 🛠️ Tech Stack

- **Framework**: NestJS 10
- **Database**: MongoDB + Mongoose
- **Cache/Sessions**: Redis (ioredis) with in-memory fallback
- **Auth**: JWT + Redis sessions
- **Password**: Argon2
- **File Upload**: Cloudinary + Multer
- **Email**: Nodemailer
- **Security**: Helmet, XSS-Clean, HPP, Mongo-Sanitize
- **Validation**: class-validator
- **Docs**: Swagger/OpenAPI

## 📚 API Endpoints

### Auth
- `POST /api/auth/register` - Register admin
- `POST /api/auth/login` - Login (sets cookies + returns tokens)
- `GET /api/auth/profile` - Get profile (protected)
- `PATCH /api/auth/profile` - Update profile (protected)
- `POST /api/auth/change-password` - Change password (protected)
- `POST /api/auth/forgot-password` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password (after OTP)
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout (protected)
- `POST /api/auth/logout-all` - Logout all devices (protected)

### Blog
- `GET /api/blog` - Get all (public, ?published=true)
- `GET /api/blog/:slug` - Get by slug (public)
- `POST /api/blog` - Create (protected, multipart/form-data with image)
- `PATCH /api/blog/:id` - Update (protected)
- `DELETE /api/blog/:id` - Delete (protected)

Full interactive API docs at: http://localhost:3001/api/docs

## 🔐 Environment Variables

Create `.env` file with:
```env
# Node Environment
NODE_ENV=development
PORT=3001
API_PREFIX=api

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wholesome-uganda

# Redis (supports both REDIS_URL and REDIS_DATABASE_URL for Upstash)
REDIS_URL=redis://localhost:6379
# REDIS_DATABASE_URL=rediss://default:password@host.upstash.io:6379

# JWT
JWT_SECRET=your-very-long-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (SMTP)
SMTP_HOST=mail.agukanet.com
SMTP_PORT=465
SMTP_USER=noreply@agukanet.com
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@agukanet.com

# Frontend & Admin URLs
FRONTEND_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
ADMIN_BASE_URL=http://localhost:3002

# Revalidation Token (for Next.js ISR)
REVALIDATE_TOKEN=wholesome-secret-token-2025
```

See `.env.example` for all variables.

## 📝 Scripts

```bash
npm run start:dev    # Development with watch
npm run start:prod   # Production
npm run build        # Build for production
npm run lint         # Lint code
npm run format       # Format code
```

## 🏗️ Architecture

### Clean NestJS Patterns
- **Modules** - Feature-based modules
- **Services** - Business logic
- **Controllers** - HTTP handlers
- **Guards** - JWT auth with Redis session validation
- **Interceptors** - Response formatting
- **Filters** - Global exception handling
- **Pipes** - Validation
- **DTOs** - Type-safe data transfer objects

### Global Services
- `RedisService` - Redis with fallback
- `EmailService` - Nodemailer integration
- `OtpService` - OTP generation & validation
- `CloudinaryService` - Image uploads
- `TokenUtil` - Session management

## 🔄 Redis Fallback

If Redis is unavailable, the system automatically falls back to in-memory storage. This ensures the application continues working even if Redis is down.

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas or secure MongoDB
3. Use Redis Cloud or secure Redis instance
4. Set strong `JWT_SECRET` (32+ characters)
5. Configure `COOKIE_DOMAIN` for your domain
6. Enable HTTPS
7. Set up Cloudinary account
8. Configure SMTP for email

See `SECURITY.md` for complete security checklist.

## 📖 Documentation

- `README.md` - This file
- `QUICKSTART.md` - Quick setup guide
- `SECURITY.md` - Security features documentation

## 🎯 Key Differences from Basic Setup

✅ Redis session management (not just JWT)
✅ OTP email system with rate limiting
✅ Refresh token rotation
✅ Argon2 password hashing
✅ Security middleware (Helmet, XSS, HPP, Mongo-sanitize)
✅ Response formatters
✅ Proper error handling
✅ Cloudinary integration
✅ Clean architecture

## 🔐 Security Best Practices

1. All secrets in `.env` (never commit)
2. Strong JWT secret (32+ characters)
3. Redis password in production
4. MongoDB authentication
5. HTTPS in production
6. Regular dependency updates

---

**Built with ❤️ for Wholesome Uganda**

*Production-ready, secure, and scalable.*
