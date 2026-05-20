const express = require("express");
const router = express.Router();
const redis = require("../utils/redisClient");
const mongoose = require("mongoose");

// Health check endpoint
router.get("/", async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {}
    };

    // Check Redis health
    try {
      const redisHealth = await redis.healthCheck();
      const redisStatus = redis.getStatus();
      
      healthStatus.services.redis = {
        status: redisHealth ? "healthy" : "degraded",
        connected: redisStatus.isConnected,
        connectionRetries: redisStatus.connectionRetries,
        fallbackStorageSize: redisStatus.fallbackStorageSize,
        usingFallback: !redisStatus.isConnected
      };
    } catch (error) {
      healthStatus.services.redis = {
        status: "unhealthy",
        error: error.message,
        usingFallback: true
      };
    }

    // Check MongoDB health
    try {
      const mongoStatus = mongoose.connection.readyState;
      const mongoStates = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
      };
      
      healthStatus.services.mongodb = {
        status: mongoStatus === 1 ? "healthy" : "degraded",
        state: mongoStates[mongoStatus] || "unknown",
        connected: mongoStatus === 1
      };
    } catch (error) {
      healthStatus.services.mongodb = {
        status: "unhealthy",
        error: error.message
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthStatus.services.memory = {
      status: "healthy",
      rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB"
    };

    // Determine overall status
    const allServices = Object.values(healthStatus.services);
    const unhealthyServices = allServices.filter(service => service.status === "unhealthy");
    const degradedServices = allServices.filter(service => service.status === "degraded");
    
    if (unhealthyServices.length > 0) {
      healthStatus.status = "unhealthy";
    } else if (degradedServices.length > 0) {
      healthStatus.status = "degraded";
    }

    // Set appropriate HTTP status code
    const statusCode = healthStatus.status === "healthy" ? 200 : 
                      healthStatus.status === "degraded" ? 200 : 503;

    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed Redis status endpoint
router.get("/redis", async (req, res) => {
  try {
    const redisStatus = redis.getStatus();
    const redisHealth = await redis.healthCheck();
    
    res.json({
      status: redisHealth ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      connected: redisStatus.isConnected,
      connectionRetries: redisStatus.connectionRetries,
      fallbackStorageSize: redisStatus.fallbackStorageSize,
      usingFallback: !redisStatus.isConnected,
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// System info endpoint
router.get("/system", (req, res) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB"
      },
      environment: process.env.NODE_ENV || "development",
      pid: process.pid
    };
    
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;

