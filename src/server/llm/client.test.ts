import { describe, expect, it } from 'vitest';
import { LlmRateLimitError } from './client';

describe('LlmRateLimitError', () => {
  it('carries retry-after seconds for job backoff', () => {
    const error = new LlmRateLimitError('slow down', 120);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('LlmRateLimitError');
    expect(error.message).toBe('slow down');
    expect(error.retryAfterSeconds).toBe(120);
  });
});
