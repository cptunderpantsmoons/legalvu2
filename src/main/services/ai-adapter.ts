import type { AIProvider as ProviderName } from '../../shared/types';
import type { BuiltPrompt } from './prompts';

export interface DraftResult {
  content: string;
  tokensUsed: number;
}

export interface AIProvider {
  generateDraft(prompt: BuiltPrompt, apiKey: string, model: string, baseUrl?: string): Promise<DraftResult>;
  streamDraft(
    prompt: BuiltPrompt,
    apiKey: string,
    model: string,
    baseUrl: string | undefined,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<DraftResult>;
}

const DEFAULT_BASE_URLS: Record<ProviderName, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};

const TIMEOUT_MS = 60_000;

function withTimeout(signal: AbortSignal, ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), ms);
  const onExternalAbort = () => controller.abort(signal.reason);
  if (signal.aborted) controller.abort(signal.reason);
  else signal.addEventListener('abort', onExternalAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onExternalAbort);
    },
  };
}

async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { signal: timedSignal, cleanup } = withTimeout(signal, TIMEOUT_MS);
    try {
      return await fn(timedSignal);
    } catch (err) {
      cleanup();
      lastError = err as Error;
      const statusMatch = lastError.message.match(/status (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      if (status >= 400 && status < 500) throw lastError;
      if (attempt === 1) throw lastError;
    } finally {
      cleanup();
    }
  }
  throw lastError!;
}

export class OpenAIAdapter implements AIProvider {
  async generateDraft(prompt: BuiltPrompt, apiKey: string, model: string, baseUrl?: string): Promise<DraftResult> {
    const url = `${baseUrl || DEFAULT_BASE_URLS.openai}/chat/completions`;
    return withRetry(async (signal) => {
      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI request failed: status ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { total_tokens?: number };
      };
      return {
        content: data.choices[0].message.content,
        tokensUsed: data.usage?.total_tokens ?? 0,
      };
    }, new AbortController().signal);
  }

  async streamDraft(
    prompt: BuiltPrompt,
    apiKey: string,
    model: string,
    baseUrl: string | undefined,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<DraftResult> {
    const url = `${baseUrl || DEFAULT_BASE_URLS.openai}/chat/completions`;
    return withRetry(async (innerSignal) => {
      const res = await fetch(url, {
        method: 'POST',
        signal: innerSignal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          temperature: 0.4,
          stream: true,
          stream_options: { include_usage: true },
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI stream failed: status ${res.status} ${res.statusText}`);
      }
      if (!res.body) throw new Error('No response body for stream');

      let content = '';
      let tokensUsed = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const event = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
              usage?: { total_tokens?: number };
            };
            const delta = event.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              onChunk(delta);
            }
            if (event.usage?.total_tokens) {
              tokensUsed = event.usage.total_tokens;
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      return { content, tokensUsed };
    }, signal);
  }
}

export class AnthropicAdapter implements AIProvider {
  async generateDraft(prompt: BuiltPrompt, apiKey: string, model: string, baseUrl?: string): Promise<DraftResult> {
    const url = `${baseUrl || DEFAULT_BASE_URLS.anthropic}/messages`;
    return withRetry(async (signal) => {
      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic request failed: status ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as {
        content: { type: string; text: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const textBlock = data.content.find((b) => b.type === 'text');
      const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
      return {
        content: textBlock?.text ?? '',
        tokensUsed,
      };
    }, new AbortController().signal);
  }

  async streamDraft(
    prompt: BuiltPrompt,
    apiKey: string,
    model: string,
    baseUrl: string | undefined,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<DraftResult> {
    const url = `${baseUrl || DEFAULT_BASE_URLS.anthropic}/messages`;
    return withRetry(async (innerSignal) => {
      const res = await fetch(url, {
        method: 'POST',
        signal: innerSignal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
          stream: true,
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic stream failed: status ${res.status} ${res.statusText}`);
      }
      if (!res.body) throw new Error('No response body for stream');

      let content = '';
      let tokensUsed = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(trimmed.slice(6)) as {
              type: string;
              delta?: { type?: string; text?: string };
              message?: { usage?: { input_tokens?: number; output_tokens?: number } };
            };
            if (event.type === 'content_block_delta' && event.delta?.text) {
              content += event.delta.text;
              onChunk(event.delta.text);
            }
            if (event.type === 'message_delta' && event.message?.usage) {
              tokensUsed = (event.message.usage.input_tokens ?? 0) + (event.message.usage.output_tokens ?? 0);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      return { content, tokensUsed };
    }, signal);
  }
}

export function getProvider(provider: ProviderName): AIProvider {
  return provider === 'anthropic' ? new AnthropicAdapter() : new OpenAIAdapter();
}
