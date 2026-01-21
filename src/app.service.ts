import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './config/redis.config';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private mongooseConnection: Connection,
    private redisService: RedisService,
  ) {}

  async getHealth() {
    // Get MongoDB status
    const mongoStatus = this.mongooseConnection.readyState;
    const mongoStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    const mongoState = mongoStates[mongoStatus] || 'unknown';
    const mongoConnected = mongoStatus === 1;

    // Get Redis status
    const redisStatusInfo = this.redisService.getStatus();
    const redisConnected = redisStatusInfo.isConnected;
    const redisUsingFallback = redisStatusInfo.usingFallback;
    const redisStatus = redisConnected ? 'healthy' : redisUsingFallback ? 'degraded' : 'unhealthy';
    
    // Try to ping Redis to verify connection
    let redisActuallyConnected = false;
    try {
      if (redisConnected) {
        const pingResult = await this.redisService.ping();
        redisActuallyConnected = pingResult === 'PONG';
      }
    } catch (error) {
      // Ping failed, Redis is not actually connected
      redisActuallyConnected = false;
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const formatBytes = (bytes: number) => {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(2)} MB`;
    };

    // Calculate overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!mongoConnected) {
      overallStatus = 'unhealthy';
    } else if (!redisActuallyConnected && !redisUsingFallback) {
      overallStatus = 'degraded';
    }

    // Calculate uptime (in seconds)
    const uptime = Math.floor(process.uptime());

    // Return health data with success field to prevent interceptor wrapping
    return {
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      services: {
        redis: {
          status: redisActuallyConnected ? 'healthy' : redisUsingFallback ? 'degraded' : 'unhealthy',
          connected: redisActuallyConnected,
          connectionRetries: 0, // Could track this if needed
          fallbackStorageSize: redisStatusInfo.fallbackStorageSize,
          usingFallback: redisUsingFallback,
        },
        mongodb: {
          status: mongoConnected ? 'healthy' : 'unhealthy',
          state: mongoState,
          connected: mongoConnected,
        },
        memory: {
          status: 'healthy', // Memory is always available
          rss: formatBytes(memoryUsage.rss),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
        },
      },
    };
  }

}
