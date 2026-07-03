/** 极小 SSE 解析器。 */
export type SseEvent = {
  event: string | null;
  data: string;
};

export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent, void, void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawBlock = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseEventBlock(rawBlock);
        if (parsed) yield parsed;
        boundary = buffer.indexOf('\n\n');
      }
    }
    const trailing = buffer.trim();
    if (trailing) {
      const parsed = parseEventBlock(trailing);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

const parseEventBlock = (block: string): SseEvent | null => {
  if (!block) return null;
  let event: string | null = null;
  const dataLines: Array<string> = [];
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (dataLines.length === 0 && event === null) return null;
  return { event, data: dataLines.join('\n') };
};
