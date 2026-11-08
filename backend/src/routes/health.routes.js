import express from 'express';
import mongoose from 'mongoose';
import { success } from '../utils/response.js';

const router = express.Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    return success(res, health);
  } catch (error) {
    next(error);
  }
});

export default router;
