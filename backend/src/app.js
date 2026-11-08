import express from 'express';
import {
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
  sanitizeMiddleware
} from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';

/**
 * Create and configure Express application
 */
export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(rateLimiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Sanitization
  app.use(sanitizeMiddleware);

  // Request logging
  app.use((req, res, next) => {
    logger.info({
      method: req.method,
      url: req.url,
      ip: req.ip
    }, 'Incoming request');
    next();
  });

  // API routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Invoice Anomaly Desk API',
      version: '1.0.0',
      status: 'running',
      documentation: '/api/health'
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
