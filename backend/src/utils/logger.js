import pino from 'pino';

const redactPaths = [
  'req.headers.authorization',
  'req.headers["x-api-key"]',
  'VULTR_INFERENCE_API_KEY',
  'MONGODB_URI',
  'ADMIN_TOKEN',
  '*.apiKey',
  '*.password',
  '*.bankAccount',
  '*.token'
];

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  },
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

export default logger;
