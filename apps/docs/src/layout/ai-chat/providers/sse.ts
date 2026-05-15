/**
 * 极小 SSE 解析器
 * @description fetch Response.body → 逐行读 → 拼 event + data → yield 出来。
 *   只支持本场景需要的子集：text/event-stream 内 `event: <name>\n` 和 `data: <payload>\n`，
 *   双换行 `\n\n` 作为事件边界。
 */
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
    // 处理 stream 末尾未带 \n\n 的最后一段
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
    // 忽略 `:comment` 和其他字段（id / retry）
  }
  if (dataLines.length === 0 && event === null) return null;
  return { event, data: dataLines.join('\n') };
};
