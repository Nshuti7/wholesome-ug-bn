import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../config/redis.config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (request: any) => string;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_OPTIONS = 'rate_limit_options';

@Injectable()
export class RedisRateLimitGuard {
  constructor(
    private redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get rate limit options from metadata
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_OPTIONS, context.getHandler());

    // If no rate limit configured, allow
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = options.keyGenerator ? options.keyGenerator(request) : this.getDefaultKey(request);

    const current = await this.redisService.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= options.max) {
      // Get remaining TTL from Redis
      const remainingTtl = await this.redisService.ttl(key);
      const retryAfter = remainingTtl > 0 ? remainingTtl : Math.ceil(options.windowMs / 1000);

      throw new HttpException(
        {
          success: false,
          message: options.message || 'Too many requests from this IP, please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    const newCount = count + 1;
    // Convert milliseconds to seconds for Redis EX expiry
    const expirySeconds = Math.ceil(options.windowMs / 1000);
    await this.redisService.set(key, newCount.toString(), expirySeconds);

    // Set response headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', options.max);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - newCount));
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + options.windowMs).toISOString());

    return true;
  }

  private getDefaultKey(request: any): string {
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const path = request.path || request.url;
    return `rate_limit:${ip}:${path}`;
  }
}
