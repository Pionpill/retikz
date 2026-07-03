import type { ProviderId } from './providers/types';

/**
 * 各家 provider 的默认 model + dropdown 推荐选项
 * @description 列表顺序按"顶端旗舰 → 经济档"。默认选各家最经济款（cost-effective），
 *   旗舰款进选项给用户在难题时切换。
 *   - deepseek：V4 Pro / Flash 双档
 *   - openai：GPT-5.5 / 5.4
 *   - anthropic：Claude 4.7 + 4.6 Opus / Sonnet
 */
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

/** 各 provider 的默认 base URL；设置里 baseUrl 留空即用这些值，填了则覆盖 */
export const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  deepseek: 'https://api.deepseek.com',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
};

/**
 * 已知模型的上下文窗口（tokens）
 * @description 用于 InputMetaRow 上下文圆环估算。截至 2026-05 公开数据，
 *   这一代各家窗口集体跳到 ~1M：DeepSeek V4 / GPT-5.4 & 5.5 / Claude 4.6+。
 *   未列出模型走 FALLBACK_CONTEXT_LIMIT。
 */
export const MODEL_CONTEXT_LIMIT: Record<string, number> = {
  // DeepSeek V4 系列 1M tokens（max output 384K）
  'deepseek-v4-pro': 1_000_000,
  'deepseek-v4-flash': 1_000_000,
  // OpenAI GPT-5 系列：5.5 = 1M（API），5.4 = 1.05M
  'gpt-5.5': 1_000_000,
  'gpt-5.4': 1_050_000,
  // Anthropic Claude 4.6/4.7：1M token 窗口（Opus 4.7 标准定价、4.6 系列 beta）
  'claude-opus-4-7': 1_000_000,
  'claude-opus-4-6': 1_000_000,
  'claude-sonnet-4-6': 1_000_000,
};

/** 未知模型的兜底窗口大小（保守值，避免百分比虚高误导用户） */
export const FALLBACK_CONTEXT_LIMIT = 32_000;
