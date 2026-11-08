/**
 * Standard success response
 * @param {object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 */
export const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    ok: true,
    data
  });
};

/**
 * Standard error response
 * @param {object} res - Express response object
 * @param {string} code - Error code (e.g., 'VALIDATION_ERROR')
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
export const error = (res, code, message, statusCode = 400) => {
  return res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message
    }
  });
};

/**
 * Error codes enum
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PIPELINE_ERROR: 'PIPELINE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
