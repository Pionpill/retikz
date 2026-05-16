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

/**
 * 已知模型的上下文窗口（tokens）
 * @description 用于 InputMetaRow 上下文圆环估算。截至 2026-05 公开数据；
 *   未列出模型走 FALLBACK_CONTEXT_LIMIT。
 */
export const MODEL_CONTEXT_LIMIT: Record<string, number> = {
  // DeepSeek（V4 系列窗口 128K）
  'deepseek-v4-flash': 128_000,
  'deepseek-chat': 128_000,
  'deepseek-reasoner': 128_000,
  // OpenAI GPT-5 系列窗口 400K
  'gpt-5-mini': 400_000,
  'gpt-5': 400_000,
  'gpt-5-nano': 400_000,
  // Anthropic Claude 4.x 窗口 200K
  'claude-haiku-4-5': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-opus-4-7': 200_000,
};

/** 未知模型的兜底窗口大小（保守值，避免百分比虚高误导用户） */
export const FALLBACK_CONTEXT_LIMIT = 32_000;
