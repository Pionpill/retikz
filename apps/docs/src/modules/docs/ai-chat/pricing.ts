import type { ProviderId } from './providers/types';

/**
 * 各家模型按 1M tokens 计的 USD 单价（截至 2026-05）
 * @description 用于 UI 估算单次会话花费；价目随厂商调整，是估算非结算。
 *   找不到对应 model id 时回退到 fallback。
 */
type Price = { inputPerMTok: number; outputPerMTok: number };

const PRICES: Record<ProviderId, Record<string, Price>> = {
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

const FALLBACK: Price = { inputPerMTok: 1, outputPerMTok: 3 };

export const estimateUsd = (provider: ProviderId, model: string, input: number, output: number): number => {
  const price = PRICES[provider][model] ?? FALLBACK;
  return (input / 1_000_000) * price.inputPerMTok + (output / 1_000_000) * price.outputPerMTok;
};

/** 格式化 USD：极小值显示 4 位小数，否则 3 位 */
export const formatUsd = (usd: number): string => {
  if (usd === 0) return '$0.000';
  if (usd < 0.001) return `<$0.001`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
};
