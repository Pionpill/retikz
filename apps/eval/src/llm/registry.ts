import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel, generateText } from 'ai';
import { type LlmClient } from './types';

/**
 * provider 登记表：id / env key / 默认模型 id（仅 anthropic 有权威默认）/ provider 工厂。
 * openai、deepseek 不内置猜测默认（defaultModel: null）——避免「猜的 id 直接进 run 路径」的脆点。
 * 模型 id：EVAL_<PROVIDER>_MODEL 覆盖 > 内置默认 > null（不启用）。
 * baseURL：EVAL_<PROVIDER>_BASE_URL 覆盖默认端点（代理 / 网关 / 兼容端点），缺省走官方端点。
 * apiKey 由各 SDK 自动读对应 env key（ANTHROPIC_API_KEY 等），不在此显式注入。
 */
export const PROVIDERS = [
  { id: 'anthropic', envKey: 'ANTHROPIC_API_KEY', defaultModel: 'claude-opus-4-8', create: createAnthropic },
  { id: 'openai', envKey: 'OPENAI_API_KEY', defaultModel: null, create: createOpenAI },
  { id: 'deepseek', envKey: 'DEEPSEEK_API_KEY', defaultModel: null, create: createDeepSeek },
] as const satisfies ReadonlyArray<{
  id: string;
  envKey: string;
  defaultModel: string | null;
  create: (options: { baseURL?: string }) => (modelId: string) => LanguageModel;
}>;

/** 读 provider 的 EVAL_<ID>_<SUFFIX> 环境变量 */
const envOf = (provider: (typeof PROVIDERS)[number], suffix: string): string | undefined =>
  process.env[`EVAL_${provider.id.toUpperCase()}_${suffix}`];

/** 解析某 provider 的模型 id：显式 env 覆盖 > 内置默认 > null（不启用） */
const modelIdFor = (provider: (typeof PROVIDERS)[number]): string | null =>
  envOf(provider, 'MODEL') ?? provider.defaultModel;

/** 当前环境里「有 key 且能定到模型 id」的 provider id 列表（保持 PROVIDERS 顺序） */
export const availableProviderIds = (): Array<string> =>
  PROVIDERS.filter((p) => Boolean(process.env[p.envKey]) && modelIdFor(p) !== null).map((p) => p.id);

/** 为所有可用 provider 建 LlmClient；底层走 Vercel AI SDK 单发 generateText；baseURL 可经 env 覆盖 */
export const createClients = (): Array<LlmClient> =>
  PROVIDERS.flatMap((p) => {
    const modelId = modelIdFor(p);
    if (!process.env[p.envKey] || modelId === null) return [];
    const provider = p.create({ baseURL: envOf(p, 'BASE_URL') });
    return [
      {
        id: `${p.id}:${modelId}`,
        generate: async (prompt: string) => {
          const { text } = await generateText({ model: provider(modelId), prompt });
          return text;
        },
      },
    ];
  });
