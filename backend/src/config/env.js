import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url(),
  VULTR_INFERENCE_API_KEY: z.string().min(1, 'Vultr API key is required'),
  VULTR_INFERENCE_BASE_URL: z.string().url().default('https://api.vultrinference.com/v1'),
  MODEL_NAME: z.string().default('meta/llama-3.1-70b-instruct'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('10'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN must be at least 32 characters'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
});

let env;

try {
  env = envSchema.parse(process.env);
  logger.info('Environment variables validated successfully');
} catch (error) {
  logger.error({ error: error.errors }, 'Environment validation failed');
  process.exit(1);
}

export default env;
