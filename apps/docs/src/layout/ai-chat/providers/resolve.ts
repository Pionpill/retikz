import { anthropicProvider } from './anthropic';
import { getProvider } from './index';
import { createOpenAiCompatProvider } from './openai-compat';
import type { ChatChunk, ChatRequestOptions, ProviderId } from './types';
import { PROVIDER_IDS } from './types';

/**
 * 自定义 provider 持久化结构
 * @description 用户在 Settings 里手动添加的第三方厂商；apiFormat 决定走 openai-compat
 *   还是 anthropic 路径；models 是用户填的预置模型列表。
 */
export type CustomProvider = {
  id: string;
  label: string;
  baseUrl: string;
  apiFormat: 'openai-compat' | 'anthropic';
  apiKey: string;
  models: ReadonlyArray<string>;
};

export const isBuiltInProviderId = (id: string): id is ProviderId =>
  (PROVIDER_IDS as ReadonlyArray<string>).includes(id);

/**
 * 把 providerId（内置或自定义）解析成可调用的 chat handle + 凭证
 * @description 内置 → 复用 providers/index 里的实例 + state 中对应 apiKey/baseUrl；
 *   自定义 → 按 apiFormat 选 openai-compat / anthropic 实例，凭证从 CustomProvider 取
 */
export type ResolvedProvider = {
  apiKey: string;
  baseUrl: string;
  chat: (opts: ChatRequestOptions) => AsyncGenerator<ChatChunk, void, void>;
};

export const resolveProvider = (
  providerId: string,
  ctx: {
    apiKeys: Record<ProviderId, string>;
    baseUrls: Record<ProviderId, string>;
    customProviders: Record<string, CustomProvider>;
  },
): ResolvedProvider | null => {
  if (isBuiltInProviderId(providerId)) {
    return {
      apiKey: ctx.apiKeys[providerId],
      baseUrl: ctx.baseUrls[providerId],
      chat: getProvider(providerId).chat,
    };
  }
  const customProvider = (ctx.customProviders as Record<string, CustomProvider | undefined>)[providerId];
  if (!customProvider) return null;
  const chat =
    customProvider.apiFormat === 'anthropic'
      ? anthropicProvider.chat
      : createOpenAiCompatProvider({ id: 'openai', baseUrl: customProvider.baseUrl }).chat;
  return {
    apiKey: customProvider.apiKey,
    baseUrl: customProvider.baseUrl,
    chat,
  };
};
