import { describe, it, expect, vi } from 'vitest';

// ponytail: inline retry implementation for testing, no import needed
async function retry(fn, options = {}) {
  const {
    maxRetries = 2,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

describe('Retry Logic', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn(async () => 'success');

    const result = await retry(fn, { maxRetries: 2 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    });

    const result = await retry(fn, { maxRetries: 3, initialDelay: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const delays = [];
    const originalSetTimeout = setTimeout;
    global.setTimeout = (fn, delay) => {
      delays.push(delay);
      return originalSetTimeout(fn, 0); // Skip actual delay
    };

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts <= 2) throw new Error('fail');
      return 'success';
    };

    await retry(fn, { maxRetries: 2, initialDelay: 100, factor: 2 });

    expect(delays[0]).toBe(100); // First retry: 100
    expect(delays[1]).toBe(200); // Second retry: 200

    global.setTimeout = originalSetTimeout;
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn(async () => {
      throw new Error('always fails');
    });

    await expect(
      retry(fn, { maxRetries: 2, initialDelay: 10 })
    ).rejects.toThrow('always fails');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});
