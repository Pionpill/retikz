import type { z } from 'zod';

/** provider payload 校验输入 */
export type ParseProviderPayloadInput<TOutput> = {
  /** 能力名称，用于错误诊断 */
  capability: string;
  /** provider key */
  providerName: string;
  /** 用户应修改的 IR 路径 */
  irPath: string;
  /** payload 名称 */
  payloadName: string;
  /** provider 声明的 payload schema */
  schema: z.ZodType<TOutput>;
  /** 原始 payload 值 */
  value: unknown;
};

/** 用统一错误上下文解析 provider payload，并保留原始 ZodError cause */
export const parseProviderPayload = <TOutput>({
  capability,
  providerName,
  irPath,
  payloadName,
  schema,
  value,
}: ParseProviderPayloadInput<TOutput>): TOutput => {
  try {
    return schema.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${capability} '${providerName}' failed ${payloadName} validation at ${irPath}: ${message}`, {
      cause: error,
    });
  }
};
