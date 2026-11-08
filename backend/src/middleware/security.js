import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import env from '../config/env.js';
import { error as errorResponse, ErrorCodes } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Security middleware configuration
 */

// Helmet - secure HTTP headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false
});

// CORS configuration
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  optionsSuccessStatus: 200
});

// Rate limiting - prevent brute force
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for auth/sensitive endpoints
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts, please try again later'
    }
  }
});

// MongoDB query sanitization - prevent NoSQL injection
export const sanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn({ key, path: req.path }, 'Sanitized potentially malicious input');
  }
});

/**
 * Admin token authentication middleware
 */
export const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'] || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return errorResponse(
      res,
      ErrorCodes.UNAUTHORIZED,
      'Admin token required',
      401
    );
  }

  // Constant-time comparison to prevent timing attacks.
  // Always run timingSafeEqual on equal-length buffers so length difference
  // doesn't leak timing info. Length mismatch is caught separately.
  const expectedBuf = Buffer.from(env.ADMIN_TOKEN);
  const receivedBuf = Buffer.alloc(expectedBuf.length);
  Buffer.from(token).copy(receivedBuf, 0, 0, expectedBuf.length);

  const lengthMatch = token.length === env.ADMIN_TOKEN.length;
  const contentMatch = crypto.timingSafeEqual(expectedBuf, receivedBuf);

  if (!lengthMatch || !contentMatch) {
    return errorResponse(
      res,
      ErrorCodes.FORBIDDEN,
      'Invalid admin token',
      403
    );
  }

  next();
};
