const Redis = require("ioredis");
const { createRedisInstance, healthCheckConfig, fallbackConfig } = require("../config/redis");

class RedisClient {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.fallbackStorage = new Map(); // In-memory fallback
    this.connectionRetries = 0;
    this.maxRetries = healthCheckConfig.maxFailures;
    this.retryDelay = healthCheckConfig.retryDelay;
    this.healthCheckInterval = null;
    
    this.init();
  }

  async init() {
    try {
      // Try to create Redis instance using configuration
      this.redis = createRedisInstance();

      // Connection event handlers
      this.redis.on('connect', () => {
        console.log('Redis connected successfully');
        this.isConnected = true;
        this.connectionRetries = 0;
      });

      this.redis.on('ready', () => {
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('🔴 Redis connection error:', err.message);
        this.isConnected = false;
        this.handleRedisError(err);
      });

      this.redis.on('close', () => {
        console.log('🟡 Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.isConnected = false;
      });

      // Attempt to connect
      await this.redis.connect();
      
      // Start periodic health checks
      this.startHealthChecks();
      
    } catch (error) {
      console.error('🔴 Failed to initialize Redis:', error.message);
      this.isConnected = false;
      this.handleRedisError(error);
    }
  }

  handleRedisError(error) {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      console.log(`🔄 Retrying Redis connection (${this.connectionRetries}/${this.maxRetries})...`);
      
      setTimeout(() => {
        this.init();
      }, this.retryDelay * this.connectionRetries);
    } else {
      console.error('🔴 Max Redis connection retries reached. Using fallback storage.');
      this.isConnected = false;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.ping();
        return true;
      }
      return false;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  // Generic set method with fallback
  async set(key, value, expiry = null, exFlag = null) {
    try {
      if (this.isConnected && this.redis) {
        // Handle both old syntax (key, value, "EX", expiry) and new syntax (key, value, expiry)
        if (exFlag === 'EX' && typeof expiry === 'number') {
          await this.redis.set(key, value, 'EX', expiry);
        } else if (typeof expiry === 'number') {
          await this.redis.set(key, value, 'EX', expiry);
        } else {
          await this.redis.set(key, value);
        }
        return true;
      } else {
        // Fallback to in-memory storage
        this.fallbackStorage.set(key, {
          value,
          expiry: expiry ? Date.now() + (expiry * 1000) : null
        });
        return true;
      }
    } catch (error) {
      console.error(`🔴 Redis set error for key ${key}:`, error.message);
      // Fallback to in-memory storage
      this.fallbackStorage.set(key, {
        value,
        expiry: expiry ? Date.now() + (expiry * 1000) : null
      });
      return true;
    }
  }

  // Generic get method with fallback
  async get(key) {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.get(key);
      } else {
        // Fallback to in-memory storage
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
      // Fallback to in-memory storage
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

  // Generic del method with fallback
  async del(...keys) {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.del(...keys);
      } else {
        // Fallback to in-memory storage
        let deletedCount = 0;
        for (const key of keys) {
          if (this.fallbackStorage.delete(key)) {
            deletedCount++;
          }
        }
        return deletedCount;
      }
    } catch (error) {
      console.error(`🔴 Redis del error for keys ${keys}:`, error.message);
      // Fallback to in-memory storage
      let deletedCount = 0;
      for (const key of keys) {
        if (this.fallbackStorage.delete(key)) {
          deletedCount++;
        }
      }
      return deletedCount;
    }
  }

  // Generic sadd method with fallback
  async sadd(key, ...members) {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.sadd(key, ...members);
      } else {
        // Fallback to in-memory storage
        if (!this.fallbackStorage.has(key)) {
          this.fallbackStorage.set(key, new Set());
        }
        const set = this.fallbackStorage.get(key);
        let addedCount = 0;
        for (const member of members) {
          if (!set.has(member)) {
            set.add(member);
            addedCount++;
          }
        }
        return addedCount;
      }
    } catch (error) {
      console.error(`🔴 Redis sadd error for key ${key}:`, error.message);
      // Fallback to in-memory storage
      if (!this.fallbackStorage.has(key)) {
        this.fallbackStorage.set(key, new Set());
      }
      const set = this.fallbackStorage.get(key);
      let addedCount = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          addedCount++;
        }
      }
      return addedCount;
    }
  }

  // Generic srem method with fallback
  async srem(key, ...members) {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.srem(key, ...members);
      } else {
        // Fallback to in-memory storage
        const set = this.fallbackStorage.get(key);
        if (!set) return 0;
        
        let removedCount = 0;
        for (const member of members) {
          if (set.delete(member)) {
            removedCount++;
          }
        }
        return removedCount;
      }
    } catch (error) {
      console.error(`🔴 Redis srem error for key ${key}:`, error.message);
      // Fallback to in-memory storage
      const set = this.fallbackStorage.get(key);
      if (!set) return 0;
      
      let removedCount = 0;
      for (const member of members) {
        if (set.delete(member)) {
          removedCount++;
        }
      }
      return removedCount;
    }
  }

  // Generic smembers method with fallback
  async smembers(key) {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.smembers(key);
      } else {
        // Fallback to in-memory storage
        const set = this.fallbackStorage.get(key);
        return set ? Array.from(set) : [];
      }
    } catch (error) {
      console.error(`🔴 Redis smembers error for key ${key}:`, error.message);
      // Fallback to in-memory storage
      const set = this.fallbackStorage.get(key);
      return set ? Array.from(set) : [];
    }
  }

  // Start periodic health checks
  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.healthCheck();
        if (isHealthy && !this.isConnected) {
          console.log('✅ Redis connection restored');
          this.isConnected = true;
          this.connectionRetries = 0;
        }
      } catch (error) {
        console.error('🔴 Health check failed:', error.message);
      }
    }, healthCheckConfig.interval);
  }

  // Stop health checks
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Cleanup expired items from fallback storage
  cleanupFallbackStorage() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.fallbackStorage.entries()) {
      if (item.expiry && item.expiry <= now) {
        this.fallbackStorage.delete(key);
        cleanedCount++;
      }
    }
    
    // Limit fallback storage size
    if (this.fallbackStorage.size > fallbackConfig.maxSize) {
      const entries = Array.from(this.fallbackStorage.entries());
      const sortedEntries = entries.sort((a, b) => {
        if (!a[1].expiry && !b[1].expiry) return 0;
        if (!a[1].expiry) return 1;
        if (!b[1].expiry) return -1;
        return a[1].expiry - b[1].expiry;
      });
      
      const toRemove = sortedEntries.slice(0, this.fallbackStorage.size - fallbackConfig.maxSize);
      toRemove.forEach(([key]) => this.fallbackStorage.delete(key));
      console.log(`🧹 Cleaned up ${toRemove.length} items from fallback storage`);
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired items from fallback storage`);
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionRetries: this.connectionRetries,
      fallbackStorageSize: this.fallbackStorage.size,
      fallbackStorageMaxSize: fallbackConfig.maxSize,
      healthCheckInterval: healthCheckConfig.interval,
      usingFallback: !this.isConnected
    };
  }

  // Graceful shutdown
  async shutdown() {
    this.stopHealthChecks();
    
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✅ Redis connection closed gracefully');
      } catch (error) {
        console.error('🔴 Error closing Redis connection:', error.message);
      }
    }
    
    // Clear fallback storage
    this.fallbackStorage.clear();
    console.log('🧹 Fallback storage cleared');
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Cleanup expired items every 5 minutes
setInterval(() => {
  redisClient.cleanupFallbackStorage();
}, 5 * 60 * 1000);

module.exports = redisClient;
