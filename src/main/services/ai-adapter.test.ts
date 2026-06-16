import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAIAdapter, AnthropicAdapter } from './ai-adapter';
import type { BuiltPrompt } from './prompts';

const mockPrompt: BuiltPrompt = {
  system: 'You are a legal assistant.',
  user: 'Draft an NDA.',
  version: 'contract-draft-v1',
};

describe('ai-adapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('OpenAIAdapter', () => {
    it('generateDraft returns content and tokens', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Contract text here' } }],
          usage: { total_tokens: 150 },
        }),
      }) as unknown as typeof fetch;

      const adapter = new OpenAIAdapter();
      const result = await adapter.generateDraft(mockPrompt, 'sk-test', 'gpt-4');
      expect(result.content).toBe('Contract text here');
      expect(result.tokensUsed).toBe(150);
    });

    it('throws on 4xx error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({}),
      }) as unknown as typeof fetch;

      const adapter = new OpenAIAdapter();
      await expect(adapter.generateDraft(mockPrompt, 'bad-key', 'gpt-4')).rejects.toThrow();
    });

    it('streamDraft parses SSE chunks and calls onChunk', async () => {
      const sseData = [
        'data: {"choices":[{"delta":{"content":"Hello "}}]}\n',
        'data: {"choices":[{"delta":{"content":"world!"}}]}\n',
        'data: {"usage":{"total_tokens":10}}\n',
        'data: [DONE]\n',
      ].join('\n');

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
        json: async () => ({}),
      }) as unknown as typeof fetch;

      const received: string[] = [];
      const adapter = new OpenAIAdapter();
      const result = await adapter.streamDraft(
        mockPrompt, 'sk-test', 'gpt-4', undefined,
        (chunk) => received.push(chunk),
        new AbortController().signal,
      );

      expect(received).toEqual(['Hello ', 'world!']);
      expect(result.content).toBe('Hello world!');
      expect(result.tokensUsed).toBe(10);
    });
  });

  describe('AnthropicAdapter', () => {
    it('generateDraft returns content and tokens', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: 'text', text: 'Contract body' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      }) as unknown as typeof fetch;

      const adapter = new AnthropicAdapter();
      const result = await adapter.generateDraft(mockPrompt, 'key', 'claude-3');
      expect(result.content).toBe('Contract body');
      expect(result.tokensUsed).toBe(150);
    });

    it('throws on error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({}),
      }) as unknown as typeof fetch;

      const adapter = new AnthropicAdapter();
      await expect(adapter.generateDraft(mockPrompt, 'key', 'claude-3')).rejects.toThrow();
    });
  });
});
