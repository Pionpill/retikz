import type { ChatChunk, ChatErrorKind, ChatProvider, ChatRequestOptions, ProviderId } from './types';

import { readSse } from './sse';

/** 构建 OpenAI-Compatible provider。 */
export const createOpenAiCompatProvider = (opts: {
  id: ProviderId;
  baseUrl: string;
  /** 是否在请求里要求服务端返回 usage（OpenAI 需要 stream_options.include_usage） */
  includeUsage?: boolean;
}): ChatProvider => ({
  id: opts.id,
  async *chat(req: ChatRequestOptions) {
    yield* runStream(opts, req);
  },
});

async function* runStream(
  cfg: { baseUrl: string; includeUsage?: boolean },
  req: ChatRequestOptions,
): AsyncGenerator<ChatChunk, void, void> {
  const baseUrl = (req.baseUrl?.trim() || cfg.baseUrl).replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: [{ role: 'system', content: req.system }, ...req.messages],
        stream: true,
        ...(cfg.includeUsage ? { stream_options: { include_usage: true } } : {}),
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

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;

  try {
    for await (const ev of readSse(res.body)) {
      if (req.signal.aborted) return;
      const payload = ev.data;
      if (!payload) continue;
      if (payload === '[DONE]') break;
      let json: OpenAiStreamChunk;
      try {
        json = JSON.parse(payload) as OpenAiStreamChunk;
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        yield { type: 'delta', text: delta };
      }
      if (json.usage) {
        inputTokens = json.usage.prompt_tokens ?? inputTokens;
        outputTokens = json.usage.completion_tokens ?? outputTokens;
        cacheRead = json.usage.prompt_tokens_details?.cached_tokens ?? cacheRead;
      }
    }
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') return;
    yield { type: 'error', kind: 'network', message: (e as Error).message };
    return;
  }

  yield { type: 'done', usage: { input: inputTokens, output: outputTokens, cacheRead } };
}

type OpenAiStreamChunk = {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
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
