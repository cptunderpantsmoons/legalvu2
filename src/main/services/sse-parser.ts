/**
 * Shared SSE (Server-Sent Events) stream parser.
 *
 * Both OpenAI and Anthropic streaming endpoints return `text/event-stream`
 * responses with `data: <json>` lines. This utility reads chunks from a
 * ReadableStream reader, buffers partial lines, and invokes `onEvent` for
 * each complete `data:` line.
 *
 * Lines that are `[DONE]` or unparseable JSON are skipped silently.
 */

export interface SSEEvent {
  /** Raw JSON-parsed payload from the `data:` line. */
  data: Record<string, unknown>;
  /** The raw payload string (before JSON.parse). */
  raw: string;
}

/**
 * Parse an SSE stream from a ReadableStreamDefaultReader.
 *
 * @param reader  The reader obtained from `response.body.getReader()`.
 * @param onEvent Called for each complete `data:` line that contains valid JSON.
 * @returns An async function that resolves when the stream is fully consumed.
 */
export async function parseSSEStream(
  reader: import("stream/web").ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const data = JSON.parse(payload) as Record<string, unknown>;
        onEvent({ data, raw: payload });
      } catch {
        // Skip malformed SSE lines
      }
    }
  }

  // Flush any remaining buffered content
  if (buffer.trim().startsWith("data: ")) {
    const payload = buffer.trim().slice(6);
    if (payload && payload !== "[DONE]") {
      try {
        const data = JSON.parse(payload) as Record<string, unknown>;
        onEvent({ data, raw: payload });
      } catch {
        // Ignore final malformed line
      }
    }
  }
}
