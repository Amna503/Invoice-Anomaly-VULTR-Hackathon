import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('Environment Validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass with valid environment variables', () => {
    const envSchema = z.object({
      MONGODB_URI: z.string().url(),
      VULTR_INFERENCE_API_KEY: z.string().min(1)
    });

    const validEnv = {
      MONGODB_URI: 'mongodb://localhost:27017/invoice-test',
      VULTR_INFERENCE_API_KEY: 'test-key-123'
    };

    expect(() => envSchema.parse(validEnv)).not.toThrow();
  });

  it('should throw when MONGODB_URI is missing', () => {
    const envSchema = z.object({
      MONGODB_URI: z.string().url()
    });

    expect(() => envSchema.parse({})).toThrow();
  });

  it('should reject invalid URL format', () => {
    const envSchema = z.object({
      MONGODB_URI: z.string().url()
    });

    const invalidEnv = {
      MONGODB_URI: 'not-a-valid-url'
    };

    expect(() => envSchema.parse(invalidEnv)).toThrow();
  });

  it('should validate required API key', () => {
    const envSchema = z.object({
      VULTR_INFERENCE_API_KEY: z.string().min(1, 'API key is required')
    });

    expect(() => envSchema.parse({ VULTR_INFERENCE_API_KEY: '' })).toThrow();
    expect(() => envSchema.parse({ VULTR_INFERENCE_API_KEY: 'valid-key' })).not.toThrow();
  });
});
