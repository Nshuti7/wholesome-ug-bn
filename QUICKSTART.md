# Quick Start Guide

## 1. Install Dependencies

```bash
cd backend
npm install
```

## 2. Setup Environment

Create `.env` file:
```env
# App
NODE_ENV=development
PORT=3001
API_PREFIX=api

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wholesome-uganda

# JWT
JWT_SECRET=your-very-long-secret-key-change-in-production
JWT_ACCESS_EXPIRATION=15m

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 3. Start MongoDB

```bash
mongod
```

## 4. Run Development Server

```bash
npm run start:dev
```

Visit:
- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs

## 5. Test Auth

### Register Admin
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@wholesomeuganda.com",
    "password": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wholesomeuganda.com",
    "password": "SecurePass123!"
  }'
```

Copy the `access_token` and use it for authenticated requests:
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📦 What's Included

✅ **Auth** - Argon2 password hashing, JWT tokens
✅ **Cloudinary** - Image uploads for blog, gallery, services
✅ **Blog** - CRUD with image upload
✅ **Gallery** - CRUD with Cloudinary
✅ **Services** - CRUD operations
✅ **Contact** - Form submissions
✅ **Newsletter** - Subscriptions
✅ **Swagger** - Interactive API docs

## 🔧 Key Features

- Clean architecture with NestJS best practices
- Centralized validation and error handling
- Standardized API responses
- File upload with Cloudinary
- Secure password hashing with Argon2
- JWT authentication
- Global exception filters
- Response interceptors

## 📝 Next Steps

1. Test all endpoints via Swagger
2. Create some blog posts with images
3. Add gallery items
4. Integrate with your Next.js frontend
5. Deploy to production

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas for database
3. Set strong JWT_SECRET
4. Configure Cloudinary account
5. Deploy to Render, Railway, or similar

