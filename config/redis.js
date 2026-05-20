const Redis = require("ioredis");

// Redis configuration with fallback options
const redisConfig = {
  // Primary Redis connection
  primary: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    retryDelayOnClusterDown: 300,
    enableOfflineQueue: false,
    maxLoadingTimeout: 10000,
  },

  // Fallback configuration (if primary fails)
  fallback: {
    host: process.env.REDIS_FALLBACK_HOST || 'localhost',
    port: process.env.REDIS_FALLBACK_PORT || 6379,
    password: process.env.REDIS_FALLBACK_PASSWORD,
    db: process.env.REDIS_FALLBACK_DB || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
  },

  // Sentinel configuration (if using Redis Sentinel)
  sentinel: process.env.REDIS_SENTINEL_ENABLED === 'true' ? {
    sentinels: [
      {
        host: process.env.REDIS_SENTINEL_HOST || 'localhost',
        port: process.env.REDIS_SENTINEL_PORT || 26379,
      }
    ],
    name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
    password: process.env.REDIS_SENTINEL_PASSWORD,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  } : null,

  // Cluster configuration (if using Redis Cluster)
  cluster: process.env.REDIS_CLUSTER_ENABLED === 'true' ? {
    nodes: process.env.REDIS_CLUSTER_NODES ? 
      process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port) || 6379 };
      }) : [
        { host: 'localhost', port: 6379 },
        { host: 'localhost', port: 6380 },
        { host: 'localhost', port: 6381 }
      ],
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    },
    clusterRetryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableOfflineQueue: false,
    maxLoadingTimeout: 10000,
  } : null,

  // Environment-specific overrides
  development: {
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
  },

  production: {
    lazyConnect: false,
    connectTimeout: 15000,
    commandTimeout: 10000,
    keepAlive: 60000,
    maxRetriesPerRequest: 5,
  },

  test: {
    lazyConnect: true,
    connectTimeout: 1000,
    commandTimeout: 1000,
    maxRetriesPerRequest: 1,
  }
};

// Get configuration based on environment
function getRedisConfig() {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = redisConfig[env] || {};
  
  // Priority: Cluster > Sentinel > Primary > Fallback
  if (redisConfig.cluster) {
    return { type: 'cluster', config: redisConfig.cluster };
  }
  
  if (redisConfig.sentinel) {
    return { type: 'sentinel', config: redisConfig.sentinel };
  }
  
  if (process.env.REDIS_DATABASE_URL) {
    return { type: 'url', config: process.env.REDIS_DATABASE_URL };
  }
  
  return { type: 'primary', config: { ...redisConfig.primary, ...baseConfig } };
}

// Create Redis instance based on configuration
function createRedisInstance() {
  const { type, config } = getRedisConfig();
  
  try {
    switch (type) {
      case 'cluster':
        return new Redis.Cluster(config.nodes, config.redisOptions);
      
      case 'sentinel':
        return new Redis(config);
      
      case 'url':
        return new Redis(config, redisConfig.primary);
      
      case 'primary':
      default:
        return new Redis(config);
    }
  } catch (error) {
    console.error('🔴 Failed to create Redis instance:', error.message);
    throw error;
  }
}

// Health check configuration
const healthCheckConfig = {
  interval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
  timeout: parseInt(process.env.REDIS_HEALTH_CHECK_TIMEOUT) || 5000,   // 5 seconds
  maxFailures: parseInt(process.env.REDIS_MAX_FAILURES) || 3,
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY) || 1000,
};

// Fallback storage configuration
const fallbackConfig = {
  maxSize: parseInt(process.env.REDIS_FALLBACK_MAX_SIZE) || 1000,
  cleanupInterval: parseInt(process.env.REDIS_FALLBACK_CLEANUP_INTERVAL) || 300000, // 5 minutes
  ttl: parseInt(process.env.REDIS_FALLBACK_TTL) || 3600, // 1 hour default
};

module.exports = {
  redisConfig,
  getRedisConfig,
  createRedisInstance,
  healthCheckConfig,
  fallbackConfig,
};

