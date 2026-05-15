/** AI 聊天面板支持的 provider 标识 */
export type ProviderId = 'deepseek' | 'openai' | 'anthropic';

export const PROVIDER_IDS: ReadonlyArray<ProviderId> = ['deepseek', 'openai', 'anthropic'];

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/** 错误类别——UI 据此显示分级提示 */
export type ChatErrorKind = 'auth' | 'rate' | 'window' | 'network' | 'unknown';

/** Provider 流式 yield 的统一事件 */
export type ChatChunk =
  | { type: 'delta'; text: string }
  | { type: 'done'; usage: ChatUsage }
  | { type: 'error'; kind: ChatErrorKind; message: string };

export type ChatUsage = {
  input: number;
  output: number;
  /** Anthropic 独有：cache 命中的 token 数（不计入主 input） */
  cacheRead?: number;
};

export type ChatRequestOptions = {
  apiKey: string;
  model: string;
  system: string;
  messages: Array<ChatMessage>;
  signal: AbortSignal;
};

/**
 * Provider 抽象：把每家自己的 SSE / event schema 转成统一 ChatChunk 流
 * @description 实现里失败应当 yield {type:'error'}，而非抛异常，让上层 UI 用同一条路径渲染
 */
export interface ChatProvider {
  id: ProviderId;
  chat: (opts: ChatRequestOptions) => AsyncGenerator<ChatChunk, void, void>;
}
