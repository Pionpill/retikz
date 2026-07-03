import type { ChatChunk, ChatRequestOptions, ProviderId } from './types';

import { anthropicProvider } from './anthropic';
import { getProvider } from './index';
import { createOpenAiCompatProvider } from './openai-compat';
import { PROVIDER_IDS } from './types';

/** 自定义 provider 持久化结构。 */
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
