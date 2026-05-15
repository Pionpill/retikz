import { anthropicProvider } from './anthropic';
import { deepseekProvider } from './deepseek';
import { openaiProvider } from './openai';
import type { ChatProvider, ProviderId } from './types';

const PROVIDERS: Record<ProviderId, ChatProvider> = {
  deepseek: deepseekProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

export const getProvider = (id: ProviderId): ChatProvider => PROVIDERS[id];

export * from './types';
