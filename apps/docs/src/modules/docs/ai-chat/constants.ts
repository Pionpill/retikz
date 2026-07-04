import type { ProviderId } from './providers/types';
import type { AutoRepairMode } from './types';

type Price = { inputPerMTok: number; outputPerMTok: number };

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

/** 未知模型的兜底窗口大小。 */
export const FALLBACK_CONTEXT_LIMIT = 32_000;

/** 各家模型按 1M tokens 计的 USD 单价；仅用于 UI 估算。 */
export const MODEL_PRICES: Record<ProviderId, Record<string, Price>> = {
  deepseek: {
    'deepseek-chat': { inputPerMTok: 0.27, outputPerMTok: 1.1 },
    'deepseek-reasoner': { inputPerMTok: 0.55, outputPerMTok: 2.19 },
  },
  openai: {
    'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6 },
    'gpt-4o': { inputPerMTok: 2.5, outputPerMTok: 10 },
    'gpt-4.1-mini': { inputPerMTok: 0.4, outputPerMTok: 1.6 },
  },
  anthropic: {
    'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
    'claude-haiku-4-5-20251001': { inputPerMTok: 1, outputPerMTok: 5 },
    'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
    'claude-opus-4-7': { inputPerMTok: 15, outputPerMTok: 75 },
  },
};

export const FALLBACK_MODEL_PRICE: Price = { inputPerMTok: 1, outputPerMTok: 3 };

export const LLMS_TXT_CACHE_TTL_MS = 5 * 60 * 1000;

/** 不同 auto-repair 档位允许的最大自动修复次数。 */
export const RETIKZ_REPAIR_MAX_BY_MODE: Record<AutoRepairMode, number> = {
  off: 0,
  limited: 3,
  always: 99,
};
