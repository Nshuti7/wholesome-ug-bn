import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as expressMongoSanitize from 'express-mongo-sanitize';
import * as xss from 'xss-clean';
import * as hpp from 'hpp';
import { RevalidateUtil } from './common/utils/revalidate.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Initialize RevalidateUtil with ConfigService
  const configService = app.get(ConfigService);
  RevalidateUtil.initialize(configService);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Data sanitization
  app.use(expressMongoSanitize());
  app.use(xss());
  app.use(hpp());

  // Cookie parser
  app.use(cookieParser());

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);

  // CORS - Support both FRONTEND_URL and ADMIN_BASE_URL
  const frontendUrl =
    process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const adminUrl =
    process.env.ADMIN_BASE_URL || process.env.ADMIN_URL || 'http://localhost:3002';

  // Build array of allowed origins (remove duplicates)
  const allowedOrigins = [frontendUrl, adminUrl].filter(
    (url, index, self) => self.indexOf(url) === index
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log for debugging but allow in development
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`CORS: Request from ${origin}, allowed: ${allowedOrigins.join(', ')}`);
          // In development, be more permissive
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Wholesome Uganda API')
    .setDescription('Clean NestJS backend with Cloudinary, Argon2, and MongoDB')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication with Argon2')
    .addTag('Blog', 'Blog posts with image upload')
    .addTag('Gallery', 'Gallery with Cloudinary')
    .addTag('Services', 'Services management')
    .addTag('Contact', 'Contact submissions')
    .addTag('Newsletter', 'Newsletter subscriptions')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  // Get MongoDB connection status
  const mongooseConnection = app.get(getConnectionToken());
  const mongoStatus = mongooseConnection.readyState;
  const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbName = mongooseConnection.db?.databaseName || 'unknown';
  const host = mongooseConnection.host || 'unknown';

  console.log(`\n🚀 Wholesome Uganda Backend`);
  console.log(`📡 API: http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Swagger: http://localhost:${port}/${apiPrefix}/docs`);

  // Service status
  if (mongoStatus === 1) {
    console.log(`✅ MongoDB connected: ${host}/${dbName}`);
  } else {
    console.log(`🟡 MongoDB ${mongoStates[mongoStatus] || 'unknown'}`);
  }

  console.log('');
}

bootstrap();
