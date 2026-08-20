import type { z } from 'zod';

import { ZodError } from 'zod';

import { createLayoutProbeRecoverableError, safeThrownDetail } from './diagnostics';

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

/** 格式化 Zod issue 的嵌套字段路径，用于补充 provider payload 定位信息 */
const formatIssuePath = (path: ReadonlyArray<PropertyKey>): string => {
  let formatted = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      formatted += `[${segment}]`;
    } else {
      formatted += `${formatted.length === 0 ? '' : '.'}${String(segment)}`;
    }
  }
  return formatted;
};

/** 为 path kind 的完整 subject schema 失败补充 schema 内字段定位 */
const appendPathKindIssuePath = (capability: string, payloadName: string, irPath: string, error: unknown): string => {
  if (capability !== 'path kind' || payloadName !== 'path' || !(error instanceof ZodError)) return irPath;
  const issuePath = formatIssuePath(error.issues[0]?.path ?? []);
  if (issuePath.length === 0) return irPath;
  return `${irPath}${issuePath.startsWith('[') ? '' : '.'}${issuePath}`;
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
    const message = safeThrownDetail(error);
    const locator = appendPathKindIssuePath(capability, payloadName, irPath, error);
    throw createLayoutProbeRecoverableError(
      `${capability} '${providerName}' failed ${payloadName} validation at ${locator}: ${message}`,
      { cause: error, providerKey: providerName },
    );
  }
};
