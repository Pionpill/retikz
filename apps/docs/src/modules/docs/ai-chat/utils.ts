import type { ProviderId } from './providers/types';

import { FALLBACK_MODEL_PRICE, LLMS_TXT_CACHE_TTL_MS, MODEL_PRICES } from './constants';

let llmsTxtCache: { text: string; at: number } | null = null;
let llmsTxtInflight: Promise<string> | null = null;

const LLMS_TXT_URL = `${import.meta.env.BASE_URL}llms.txt`;
const BOM_RE = /^\uFEFF/;

export const fetchLlmsTxt = async (): Promise<string> => {
  const now = Date.now();
  if (llmsTxtCache && now - llmsTxtCache.at < LLMS_TXT_CACHE_TTL_MS) return llmsTxtCache.text;
  if (llmsTxtInflight) return llmsTxtInflight;
  llmsTxtInflight = (async () => {
    try {
      const res = await fetch(LLMS_TXT_URL);
      if (!res.ok) return '';
      const text = await res.text();
      const clean = text.replace(BOM_RE, '');
      llmsTxtCache = { text: clean, at: Date.now() };
      return clean;
    } catch {
      return '';
    } finally {
      llmsTxtInflight = null;
    }
  })();
  return llmsTxtInflight;
};

export const estimateUsd = (provider: ProviderId, model: string, input: number, output: number): number => {
  const price = MODEL_PRICES[provider][model] ?? FALLBACK_MODEL_PRICE;
  return (input / 1_000_000) * price.inputPerMTok + (output / 1_000_000) * price.outputPerMTok;
};

/** 格式化 USD：极小值显示 4 位小数，否则 3 位。 */
export const formatUsd = (usd: number): string => {
  if (usd === 0) return '$0.000';
  if (usd < 0.001) return `<$0.001`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
};
