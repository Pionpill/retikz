import { readSse } from './sse';
import type { ChatChunk, ChatErrorKind, ChatProvider, ChatRequestOptions } from './types';

/**
 * Anthropic Messages API（直连浏览器要求 `anthropic-dangerous-direct-browser-access: true`）
 * @description SSE 由 `event: <type>\ndata: {json}` 组成；text 在 content_block_delta；usage 分两段：
 *   message_start 里给 input_tokens + cache_read_input_tokens；message_delta 里给 output_tokens。
 */
export const anthropicProvider: ChatProvider = {
  id: 'anthropic',
  async *chat(req: ChatRequestOptions): AsyncGenerator<ChatChunk, void, void> {
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'x-api-key': req.apiKey,
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: 4096,
          stream: true,
          system: req.system,
          messages: req.messages,
        }),
        signal: req.signal,
      });
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
      yield { type: 'error', kind: 'network', message: (e as Error).message };
      return;
    }

    if (!res.ok) {
      const body = await safeText(res);
      yield { type: 'error', kind: classifyHttp(res.status), message: shortError(body, res.status) };
      return;
    }
    if (!res.body) {
      yield { type: 'error', kind: 'network', message: 'empty response body' };
      return;
    }

    let input = 0;
    let output = 0;
    let cacheRead = 0;

    try {
      for await (const ev of readSse(res.body)) {
        if (req.signal.aborted) return;
        if (!ev.data) continue;
        let json: AnthropicEvent;
        try {
          json = JSON.parse(ev.data) as AnthropicEvent;
        } catch {
          continue;
        }
        if (json.type === 'message_start' && json.message?.usage) {
          input = json.message.usage.input_tokens ?? 0;
          cacheRead = json.message.usage.cache_read_input_tokens ?? 0;
        } else if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
          yield { type: 'delta', text: json.delta.text };
        } else if (json.type === 'message_delta' && json.usage) {
          output = json.usage.output_tokens ?? output;
        }
      }
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
      yield { type: 'error', kind: 'network', message: (e as Error).message };
      return;
    }

    yield { type: 'done', usage: { input, output, cacheRead } };
  },
};

type AnthropicEvent = {
  type: string;
  message?: {
    usage?: { input_tokens?: number; cache_read_input_tokens?: number };
  };
  delta?: { type?: string; text?: string };
  usage?: { output_tokens?: number };
};

const classifyHttp = (status: number): ChatErrorKind => {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  if (status === 400) return 'window';
  return 'unknown';
};

const safeText = async (res: Response): Promise<string> => {
  try {
    return await res.text();
  } catch {
    return '';
  }
};

const shortError = (body: string, status: number): string => {
  if (!body) return `HTTP ${status}`;
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j.error?.message) return j.error.message;
  } catch {
    // not json, ignore
  }
  return body.slice(0, 200);
};
