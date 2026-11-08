import logger from './logger.js';

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 2)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.factor - Backoff factor (default: 2)
 * @param {string} options.operationName - Name for logging
 * @returns {Promise<*>} Result of the function
 */
export async function retry(fn, options = {}) {
  const {
    maxRetries = 2,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    operationName = 'operation'
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);

        logger.warn({
          operationName,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          nextRetryIn: delay,
          error: error.message
        }, `${operationName} failed, retrying...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error({
    operationName,
    attempts: maxRetries + 1,
    error: lastError.message
  }, `${operationName} failed after all retries`);

  throw lastError;
}
