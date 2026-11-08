import logger from '../utils/logger.js';
import { error as errorResponse, ErrorCodes } from '../utils/response.js';
import env from '../config/env.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    err,
    url: req.url,
    method: req.method,
    ip: req.ip
  }, 'Error occurred');

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return errorResponse(
      res,
      ErrorCodes.VALIDATION_ERROR,
      Object.values(err.errors).map(e => e.message).join(', '),
      400
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(
      res,
      ErrorCodes.VALIDATION_ERROR,
      `Invalid ${err.path}: ${err.value}`,
      400
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(
      res,
      ErrorCodes.VALIDATION_ERROR,
      `Duplicate ${field} already exists`,
      409
    );
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(
        res,
        ErrorCodes.FILE_TOO_LARGE,
        `File too large. Maximum size is ${env.MAX_FILE_SIZE_MB}MB`,
        413
      );
    }
    return errorResponse(
      res,
      ErrorCodes.UPLOAD_FAILED,
      err.message,
      400
    );
  }

  // Zod validation error (zod v4 uses .issues, v3 used .errors)
  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return errorResponse(
      res,
      ErrorCodes.VALIDATION_ERROR,
      issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      400
    );
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production'
    ? 'An internal error occurred'
    : err.message || 'Internal server error';

  return errorResponse(
    res,
    err.code || ErrorCodes.INTERNAL_ERROR,
    message,
    statusCode
  );
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    ErrorCodes.NOT_FOUND,
    `Cannot ${req.method} ${req.url}`,
    404
  );
};
