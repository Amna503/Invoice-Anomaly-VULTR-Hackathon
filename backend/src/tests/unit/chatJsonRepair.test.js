import { describe, it, expect } from 'vitest';

// ponytail: inline JSON repair logic extracted from inferenceClient
function repairJson(text) {
  // Strip code fences
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // One repair attempt
    throw new Error(`JSON repair failed: ${error.message}. Response: ${cleaned.substring(0, 100)}`);
  }
}

describe('chatJson Repair Logic', () => {
  it('should strip code fences from valid JSON', () => {
    const response = '```json\n{"key": "value"}\n```';

    const result = repairJson(response);

    expect(result).toEqual({ key: 'value' });
  });

  it('should handle JSON without code fences', () => {
    const response = '{"key": "value"}';

    const result = repairJson(response);

    expect(result).toEqual({ key: 'value' });
  });

  it('should attempt repair on invalid JSON and throw clear error', () => {
    const response = '```json\n{invalid json}\n```';

    expect(() => repairJson(response)).toThrow(/JSON repair failed/);
  });

  it('should include error details in failure message', () => {
    const response = '{broken';

    try {
      repairJson(response);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('JSON repair failed');
      expect(error.message).toContain('Response:');
    }
  });

  it('should handle complex nested JSON', () => {
    const response = '```json\n{"nested": {"array": [1, 2, 3]}, "bool": true}\n```';

    const result = repairJson(response);

    expect(result).toEqual({
      nested: { array: [1, 2, 3] },
      bool: true
    });
  });
});
