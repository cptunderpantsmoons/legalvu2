export interface AIProvider {
  generateDraft(prompt: string, apiKey: string, model: string): Promise<string>;
}

export class OpenAIAdapter implements AIProvider {
  async generateDraft(prompt: string, apiKey: string, model: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4 }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices[0].message.content;
  }
}

export class AnthropicAdapter implements AIProvider {
  async generateDraft(prompt: string, apiKey: string, model: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.statusText}`);
    const data = await res.json() as { content: { type: string; text: string }[] };
    return data.content[0].text;
  }
}

export function getProvider(provider: 'openai' | 'anthropic'): AIProvider {
  return provider === 'anthropic' ? new AnthropicAdapter() : new OpenAIAdapter();
}
