import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const completionCreateMock = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: vi.fn(function OpenAIMock() {
    return {
      chat: {
        completions: {
          create: completionCreateMock,
        },
      },
    };
  }),
}));

import { LlmRateLimitError, llmJson } from './client';

function completion(content: string) {
  return { choices: [{ message: { content } }] };
}

describe('LlmRateLimitError', () => {
  it('carries retry-after seconds for job backoff', () => {
    const error = new LlmRateLimitError('slow down', 120);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('LlmRateLimitError');
    expect(error.message).toBe('slow down');
    expect(error.retryAfterSeconds).toBe(120);
  });
});

describe('llmJson', () => {
  const originalApiKey = process.env.LLM_API_KEY;

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-key';
    completionCreateMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.LLM_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it('requests JSON mode and parses a valid JSON object', async () => {
    completionCreateMock.mockResolvedValueOnce(completion('{"ok":true,"count":2}'));

    await expect(llmJson({ provider: 'openai', model: 'gpt-test' }, 'return json')).resolves.toEqual({
      ok: true,
      count: 2,
    });

    expect(completionCreateMock).toHaveBeenCalledTimes(1);
    expect(completionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-test',
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    );
  });

  it('extracts JSON from fenced or chatty model output', async () => {
    completionCreateMock.mockResolvedValueOnce(completion('```json\n{"ok":true}\n```'));

    await expect(llmJson({ provider: 'openai', model: 'gpt-test' }, 'return json')).resolves.toEqual({
      ok: true,
    });

    completionCreateMock.mockResolvedValueOnce(completion('Sure:\n{"ok":true,"nested":{"x":"} still text"}}\nDone.'));

    await expect(llmJson({ provider: 'openai', model: 'gpt-test' }, 'return json')).resolves.toEqual({
      ok: true,
      nested: { x: '} still text' },
    });
  });

  it('retries with correction context when validation rejects the first response', async () => {
    completionCreateMock
      .mockResolvedValueOnce(completion('{"score":150}'))
      .mockResolvedValueOnce(completion('{"score":82}'));

    const result = await llmJson(
      { provider: 'openai', model: 'gpt-test' },
      'score article',
      (value) => {
        const score = (value as { score?: unknown }).score;
        if (typeof score !== 'number' || score > 100) throw new Error('score out of range');
        return { score };
      },
    );

    expect(result).toEqual({ score: 82 });
    expect(completionCreateMock).toHaveBeenCalledTimes(2);
    expect(completionCreateMock.mock.calls[1][0].messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('score out of range'),
        }),
      ]),
    );
  });

  it('falls back without JSON mode when the provider rejects response_format', async () => {
    completionCreateMock
      .mockRejectedValueOnce(new Error('response_format is not supported'))
      .mockResolvedValueOnce(completion('{"ok":true}'));

    await expect(llmJson({ provider: 'openrouter', model: 'open/model' }, 'return json')).resolves.toEqual({
      ok: true,
    });

    expect(completionCreateMock).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        response_format: expect.anything(),
      }),
    );
  });

  it('converts provider 429 responses into retryable rate-limit errors', async () => {
    completionCreateMock.mockRejectedValueOnce({
      status: 429,
      headers: new Headers({ 'retry-after': '120' }),
      message: 'too many requests',
    });

    await expect(llmJson({ provider: 'openai', model: 'gpt-test' }, 'return json')).rejects.toMatchObject({
      name: 'LlmRateLimitError',
      retryAfterSeconds: 120,
    });
  });

  it('fails clearly after three invalid responses', async () => {
    completionCreateMock
      .mockResolvedValueOnce(completion(''))
      .mockResolvedValueOnce(completion('not json'))
      .mockResolvedValueOnce(completion('{"still":"missing required field"}'));

    await expect(
      llmJson({ provider: 'openai', model: 'gpt-test' }, 'return json', (value) => {
        if ((value as { ok?: unknown }).ok !== true) throw new Error('ok must be true');
        return value;
      }),
    ).rejects.toThrow('LLM did not return valid JSON');

    expect(completionCreateMock).toHaveBeenCalledTimes(3);
  });
});
