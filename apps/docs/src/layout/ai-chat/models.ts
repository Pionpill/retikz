import type { ProviderId } from './providers/types';

/**
 * 各家 provider 的默认 model + dropdown 推荐选项
 * @description deepseek 主推 V4 Flash（quick / cheap），同时留 chat 别名 + reasoner；
 *   openai 切 GPT-5 系列；anthropic 走 Claude 4.X（Opus 4.7 / Sonnet 4.6 / Haiku 4.5）。
 *   Default 选各家中端档（cost-effective），高端档进选项给用户切换。
 */
export const MODEL_CHOICES: Record<ProviderId, ReadonlyArray<string>> = {
  deepseek: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
  openai: ['gpt-5-mini', 'gpt-5', 'gpt-5-nano'],
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-7'],
};

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  deepseek: 'deepseek-v4-flash',
  openai: 'gpt-5-mini',
  anthropic: 'claude-haiku-4-5',
};

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

/** 各 provider 的默认 base URL；设置里 baseUrl 留空即用这些值，填了则覆盖 */
export const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  deepseek: 'https://api.deepseek.com',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
};
