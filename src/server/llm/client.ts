import OpenAI from 'openai';

export type LlmProvider = 'openrouter' | 'openai';

export type LlmConfig = {
  provider: LlmProvider;
  apiKey?: string;
  model: string;
};

export async function llmJson<T>(cfg: LlmConfig, prompt: string): Promise<T> {
  const apiKey = cfg.apiKey ?? process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('Missing LLM_API_KEY');

  const baseURL =
    cfg.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : undefined;

  const client = new OpenAI({ apiKey, baseURL });

  const resp = await client.chat.completions.create({
    model: cfg.model,
    messages: [
      {
        role: 'system',
        content:
          'Return ONLY valid JSON. No markdown. No commentary. Must conform to the schema in the user message.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  const text = resp.choices[0]?.message?.content ?? '';
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`LLM did not return valid JSON: ${text.slice(0, 300)}`);
  }
}
