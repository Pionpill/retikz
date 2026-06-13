import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { type LanguageModel, generateText } from 'ai';
import { type LlmClient } from './types';

/**
 * provider 登记表：id / env key / 默认模型 id（仅 anthropic 有权威默认）/ 模型工厂。
 * openai、deepseek 不内置猜测默认（defaultModel: null）——避免「猜的 id 直接进 run 路径」的脆点。
 * 模型 id 来源：EVAL_<PROVIDER>_MODEL 环境变量，缺省时回落 defaultModel；仍为 null 则该 provider 不启用。
 */
export const PROVIDERS = [
  { id: 'anthropic', envKey: 'ANTHROPIC_API_KEY', defaultModel: 'claude-opus-4-8', model: anthropic },
  { id: 'openai', envKey: 'OPENAI_API_KEY', defaultModel: null, model: openai },
  { id: 'deepseek', envKey: 'DEEPSEEK_API_KEY', defaultModel: null, model: deepseek },
] as const satisfies ReadonlyArray<{
  id: string;
  envKey: string;
  defaultModel: string | null;
  model: (modelId: string) => LanguageModel;
}>;

/** 解析某 provider 的模型 id：显式 env 覆盖 > 内置默认 > null（不启用） */
const modelIdFor = (provider: (typeof PROVIDERS)[number]): string | null =>
  process.env[`EVAL_${provider.id.toUpperCase()}_MODEL`] ?? provider.defaultModel;

/** 当前环境里「有 key 且能定到模型 id」的 provider id 列表（保持 PROVIDERS 顺序） */
export const availableProviderIds = (): Array<string> =>
  PROVIDERS.filter((p) => Boolean(process.env[p.envKey]) && modelIdFor(p) !== null).map((p) => p.id);

/** 为所有可用 provider 建 LlmClient；底层走 Vercel AI SDK 单发 generateText */
export const createClients = (): Array<LlmClient> =>
  PROVIDERS.flatMap((p) => {
    const modelId = modelIdFor(p);
    if (!process.env[p.envKey] || modelId === null) return [];
    return [
      {
        id: `${p.id}:${modelId}`,
        generate: async (prompt: string) => {
          const { text } = await generateText({ model: p.model(modelId), prompt });
          return text;
        },
      },
    ];
  });
