import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions } from '../guards/redis-rate-limit.guard';
import { RATE_LIMIT_OPTIONS } from '../guards/redis-rate-limit.guard';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_OPTIONS, options);

// Pre-configured rate limiters
export const GeneralRateLimit = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
  });

export const FormSubmissionRateLimit = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 form submissions per 15 minutes
    message: 'Too many form submissions from this IP, please try again later.',
  });

export const StrictRateLimit = () =>
  RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: 'Too many attempts from this IP, please try again later.',
  });

export const AuthRateLimit = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    keyGenerator: (request) => {
      const ip = request.ip || request.connection.remoteAddress || 'unknown';
      const email = request.body?.email || 'unknown';
      return `rate_limit:auth:${ip}:${email}`;
    },
  });
