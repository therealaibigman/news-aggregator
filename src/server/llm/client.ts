import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createLogger } from '../logging/logger';

export type LlmProvider = 'openrouter' | 'openai';

export type LlmConfig = {
  provider: LlmProvider;
  apiKey?: string;
  model: string;
};

const logger = createLogger('llm.client');

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

function findBalancedJson(text: string, open: '{' | '[', close: '}' | ']') {
  const start = text.indexOf(open);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function parseJsonFromText(text: string) {
  const cleaned = stripCodeFence(text);
  if (!cleaned) throw new Error('empty model response');

  const candidates = [cleaned, findBalancedJson(cleaned, '{', '}'), findBalancedJson(cleaned, '[', ']')].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('no valid JSON found');
}

function validationMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function llmJson<T>(cfg: LlmConfig, prompt: string, validate?: (value: unknown) => T): Promise<T> {
  const apiKey = cfg.apiKey ?? process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('Missing LLM_API_KEY');

  const baseURL =
    cfg.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : undefined;

  const client = new OpenAI({ apiKey, baseURL });

  const baseMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'Return one valid JSON object only. No markdown, code fences, comments, arrays, or commentary. Must conform to the schema in the user message.',
    },
    { role: 'user', content: prompt },
  ];

  let lastText = '';
  let lastError = '';
  let useJsonMode = true;

  for (let attempt = 0; attempt < 3; attempt++) {
    const messages: ChatCompletionMessageParam[] =
      attempt === 0
        ? baseMessages
        : [
            ...baseMessages,
            {
              role: 'user',
              content: `The previous response was invalid: ${lastError}. Return only a corrected JSON object for the original task.`,
            },
          ];

    try {
      const resp = useJsonMode
        ? await client.chat.completions.create({
            model: cfg.model,
            messages,
            temperature: 0,
            response_format: { type: 'json_object' },
          })
        : await client.chat.completions.create({
            model: cfg.model,
            messages,
            temperature: 0,
          });

      lastText = resp.choices[0]?.message?.content ?? '';
    } catch (e) {
      if (!useJsonMode) throw e;
      useJsonMode = false;
      logger.warn('json_mode_fallback', {
        provider: cfg.provider,
        model: cfg.model,
        attempt: attempt + 1,
        error: e,
      });

      const resp = await client.chat.completions.create({
        model: cfg.model,
        messages,
        temperature: 0,
      });

      lastText = resp.choices[0]?.message?.content ?? '';
    }

    try {
      const parsed = parseJsonFromText(lastText);
      return validate ? validate(parsed) : (parsed as T);
    } catch (e) {
      lastError = validationMessage(e);
      logger.warn('json_response_rejected', {
        provider: cfg.provider,
        model: cfg.model,
        attempt: attempt + 1,
        error: e,
        responsePreview: lastText.slice(0, 500),
      });
    }
  }

  logger.error('json_response_failed', {
    provider: cfg.provider,
    model: cfg.model,
    error: lastError,
    responsePreview: lastText.slice(0, 500),
  });
  throw new Error(`LLM did not return valid JSON: ${lastText.slice(0, 300)}`);
}
