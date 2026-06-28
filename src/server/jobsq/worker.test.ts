import { describe, expect, it } from 'vitest';
import { LlmRateLimitError } from '../llm/client';
import { retryDelaySeconds } from './worker';

describe('retryDelaySeconds', () => {
  it('uses short exponential backoff for ordinary job failures', () => {
    expect(retryDelaySeconds(1, new Error('failed'))).toBe(10);
    expect(retryDelaySeconds(2, new Error('failed'))).toBe(20);
    expect(retryDelaySeconds(8, new Error('failed'))).toBe(1280);
    expect(retryDelaySeconds(99, new Error('failed'))).toBe(1280);
  });

  it('uses longer capped backoff for LLM rate limits', () => {
    expect(retryDelaySeconds(1, new LlmRateLimitError('slow down'))).toBe(60);
    expect(retryDelaySeconds(4, new LlmRateLimitError('slow down'))).toBe(480);
    expect(retryDelaySeconds(8, new LlmRateLimitError('slow down'))).toBe(3600);
    expect(retryDelaySeconds(99, new LlmRateLimitError('slow down'))).toBe(3600);
  });

  it('honors provider retry-after when it is slower than exponential backoff', () => {
    expect(retryDelaySeconds(1, new LlmRateLimitError('slow down', 900))).toBe(900);
  });

  it('keeps exponential backoff when retry-after is shorter', () => {
    expect(retryDelaySeconds(4, new LlmRateLimitError('slow down', 30))).toBe(480);
  });
});
