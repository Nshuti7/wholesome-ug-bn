import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../config/redis.config';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

@Injectable()
export class TokenUtil {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async sendTokenResponse(userId: string, email: string, role: string, res: Response, req: any) {
    const sessionId = uuidv4();

    const accessToken = this.jwtService.sign(
      { id: userId, email, role, jti: sessionId },
      {
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { id: userId, email, role, jti: sessionId },
      {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      },
    );

    // Store session in Redis
    try {
      await this.storeSession(sessionId, {
        userId: userId.toString(),
        accessToken,
        refreshToken,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        createdAt: Date.now(),
      });
    } catch (redisError) {
      console.error('🔴 CRITICAL: Failed to store session in Redis.', redisError);
      throw new Error('Session storage failed. Cannot log in.');
    }

    // Set cookies
    const cookieOptions = this.getCookieOptions();
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const payload: any = {
      success: true,
      message: 'Logged in successfully',
    };

    if (process.env.NODE_ENV !== 'production') {
      payload.accessToken = accessToken;
      payload.refreshToken = refreshToken;
    }

    return res.status(200).json(payload);
  }

  private async storeSession(sessionId: string, sessionData: any) {
    const key = `session:${sessionId}`;
    const ttl = 60 * 60 * 24 * 7; // 7 days
    await this.redisService.set(key, JSON.stringify(sessionData), ttl);
    await this.redisService.sadd(`user_sessions:${sessionData.userId}`, sessionId);
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await this.redisService.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.getSession(sessionId);
    await this.redisService.del(sessionKey);
    if (sessionData?.userId) {
      await this.redisService.srem(`user_sessions:${sessionData.userId}`, sessionId);
    }
  }

  async invalidateAllUserSessions(userId: string) {
    const key = `user_sessions:${userId}`;
    try {
      const sessionIds = await this.redisService.smembers(key);
      if (sessionIds.length) {
        const keysToDelete = sessionIds.map((id) => `session:${id}`);
        await this.redisService.del(...keysToDelete);
      }
      await this.redisService.del(key);
    } catch (err) {
      console.error(`[redis] Failed to invalidate sessions for ${userId}:`, err);
    }
  }

  getCookieOptions() {
    const base: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/', // Ensure cookies are available for all paths
    };

    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    if (cookieDomain) {
      base.domain = cookieDomain;
    }

    return base;
  }
}
