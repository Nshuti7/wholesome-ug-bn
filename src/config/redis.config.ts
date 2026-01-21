import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private isConnected = false;
  private fallbackStorage = new Map<string, { value: string; expiry: number | null }>();
  private maxRetries = 3;
  private retryDelay = 2000;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.init();
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private async init() {
    try {
      // Support both REDIS_URL and REDIS_DATABASE_URL (for Upstash)
      const redisUrl =
        this.configService.get<string>('REDIS_DATABASE_URL') ||
        this.configService.get<string>('REDIS_URL') ||
        'redis://localhost:6379';

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        enableOfflineQueue: true, // Enable queue to handle commands before connection is ready
        lazyConnect: false, // Connect immediately
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
      });

      this.redis.on('ready', async () => {
        this.isConnected = true;
        try {
          await this.redis.ping();
          console.log('✅ Redis connected successfully');
        } catch (error) {
          console.error('🔴 Redis ping failed:', error.message);
        }
      });

      this.redis.on('error', (err) => {
        // Only log errors if not already connected (to avoid spam)
        if (!this.isConnected) {
          console.error('🔴 Redis connection error:', err.message);
        }
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('🟡 Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.isConnected = false;
      });

      // Wait a bit for connection to establish, then test
      // The ping will be done in the 'ready' event handler
    } catch (error) {
      console.error('🔴 Failed to initialize Redis:', error.message);
      this.isConnected = false;
    }
  }

  async set(key: string, value: string, expiry?: number): Promise<boolean> {
    try {
      if (this.isConnected && this.redis) {
        if (expiry) {
          await this.redis.set(key, value, 'EX', expiry);
        } else {
          await this.redis.set(key, value);
        }
        return true;
      } else {
        // Fallback to in-memory storage
        this.fallbackStorage.set(key, {
          value,
          expiry: expiry ? Date.now() + expiry * 1000 : null,
        });
        return true;
      }
    } catch (error) {
      console.error(`🔴 Redis set error for key ${key}:`, error.message);
      this.fallbackStorage.set(key, {
        value,
        expiry: expiry ? Date.now() + expiry * 1000 : null,
      });
      return true;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.get(key);
      } else {
        const item = this.fallbackStorage.get(key);
        if (item && (!item.expiry || item.expiry > Date.now())) {
          return item.value;
        }
        if (item && item.expiry && item.expiry <= Date.now()) {
          this.fallbackStorage.delete(key);
        }
        return null;
      }
    } catch (error) {
      console.error(`🔴 Redis get error for key ${key}:`, error.message);
      const item = this.fallbackStorage.get(key);
      if (item && (!item.expiry || item.expiry > Date.now())) {
        return item.value;
      }
      if (item && item.expiry && item.expiry <= Date.now()) {
        this.fallbackStorage.delete(key);
      }
      return null;
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.del(...keys);
      } else {
        let deletedCount = 0;
        for (const key of keys) {
          if (this.fallbackStorage.delete(key)) {
            deletedCount++;
          }
        }
        return deletedCount;
      }
    } catch (error) {
      console.error(`🔴 Redis del error:`, error.message);
      let deletedCount = 0;
      for (const key of keys) {
        if (this.fallbackStorage.delete(key)) {
          deletedCount++;
        }
      }
      return deletedCount;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.sadd(key, ...members);
      } else {
        // Fallback storage for sets
        if (!this.fallbackStorage.has(key)) {
          this.fallbackStorage.set(key, { value: JSON.stringify(new Set()), expiry: null });
        }
        const item = this.fallbackStorage.get(key);
        const set = new Set(JSON.parse(item.value));
        let added = 0;
        for (const member of members) {
          if (!set.has(member)) {
            set.add(member);
            added++;
          }
        }
        this.fallbackStorage.set(key, {
          value: JSON.stringify(Array.from(set)),
          expiry: item.expiry,
        });
        return added;
      }
    } catch (error) {
      console.error(`🔴 Redis sadd error:`, error.message);
      return 0;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.srem(key, ...members);
      } else {
        const item = this.fallbackStorage.get(key);
        if (!item) return 0;
        const set = new Set(JSON.parse(item.value));
        let removed = 0;
        for (const member of members) {
          if (set.delete(member)) {
            removed++;
          }
        }
        this.fallbackStorage.set(key, {
          value: JSON.stringify(Array.from(set)),
          expiry: item.expiry,
        });
        return removed;
      }
    } catch (error) {
      console.error(`🔴 Redis srem error:`, error.message);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.smembers(key);
      } else {
        const item = this.fallbackStorage.get(key);
        if (!item) return [];
        return JSON.parse(item.value);
      }
    } catch (error) {
      console.error(`🔴 Redis smembers error:`, error.message);
      return [];
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.ttl(key);
      } else {
        const item = this.fallbackStorage.get(key);
        if (!item || !item.expiry) return -1;
        const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -1;
      }
    } catch (error) {
      console.error(`🔴 Redis ttl error:`, error.message);
      return -1;
    }
  }

  private async shutdown() {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✅ Redis connection closed gracefully');
      } catch (error) {
        console.error('🔴 Error closing Redis connection:', error.message);
      }
    }
    this.fallbackStorage.clear();
  }

  async ping(): Promise<string> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.ping();
      }
      throw new Error('Redis not connected');
    } catch (error) {
      throw error;
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      fallbackStorageSize: this.fallbackStorage.size,
      usingFallback: !this.isConnected,
    };
  }
}
