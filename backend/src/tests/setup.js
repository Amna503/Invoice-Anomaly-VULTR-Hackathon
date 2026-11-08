import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Prevent process.exit in tests
const originalExit = process.exit;
process.exit = (code) => {
  if (process.env.NODE_ENV === 'test') {
    throw new Error(`process.exit(${code}) called during test`);
  }
  return originalExit(code);
};
