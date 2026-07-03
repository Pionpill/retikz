import type { ProviderId } from './providers/types';

/** 各 provider 的模型选项。 */
export const MODEL_CHOICES: Record<ProviderId, ReadonlyArray<string>> = {
  deepseek: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  openai: ['gpt-5.5', 'gpt-5.4'],
  anthropic: ['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6'],
};

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  deepseek: 'deepseek-v4-flash',
  openai: 'gpt-5.4',
  anthropic: 'claude-sonnet-4-6',
};

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

/** 各 provider 的默认 base URL。 */
export const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  deepseek: 'https://api.deepseek.com',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
};

/** 已知模型的上下文窗口。 */
export const MODEL_CONTEXT_LIMIT: Record<string, number> = {
  'deepseek-v4-pro': 1_000_000,
  'deepseek-v4-flash': 1_000_000,
  'gpt-5.5': 1_000_000,
  'gpt-5.4': 1_050_000,
  'claude-opus-4-7': 1_000_000,
  'claude-opus-4-6': 1_000_000,
  'claude-sonnet-4-6': 1_000_000,
};

/** 未知模型的兜底窗口大小（保守值，避免百分比虚高误导用户） */
export const FALLBACK_CONTEXT_LIMIT = 32_000;
