import { formatPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

import {
  createLayoutProbeRecoverableError,
  safeThrownDetail,
  createCompositeContractError,
  isCompositeContractError,
  isFatalProbeError,
} from './diagnostics';

/**
 * 扩展定义的输入数据与校验、诊断配置
 * @template TOutput 扩展定义的 schema 解析后的输出类型
 */
type InputProviderPayloadParsing<TOutput> = {
  /** 能力名称，用于错误诊断 */
  capability: string;
  /** 能力提供者的注册键 */
  providerName: string;
  /** 用户应修改的 IR 路径 */
  irPath: PropertyPath;
  /** 待校验数据的名称，用于诊断文案 */
  payloadName: string;
  /** 扩展定义声明的数据 schema */
  schema: ZodType<TOutput>;
  /** 待解析的原始数据 */
  value: unknown;
};

/** 将首个 schema 问题定位到输入属性路径 */
const appendPathIssuePath = (
  capability: string,
  payloadName: string,
  irPath: PropertyPath,
  error: unknown,
): PropertyPath => {
  if (capability !== 'path' || payloadName !== 'path' || !(error instanceof ZodError)) return irPath;
  return [
    ...irPath,
    ...(error.issues[0]?.path ?? []).map(segment => (typeof segment === 'symbol' ? String(segment) : segment)),
  ];
};

/**
 * 按扩展定义的 schema 解析输入；失败时包装为布局候选失败，并将原始异常保留为 cause
 * @template TOutput 扩展定义的 schema 解析后的输出类型
 */
export const parseProviderPayload = <TOutput>({
  capability,
  providerName,
  irPath,
  payloadName,
  schema,
  value,
}: InputProviderPayloadParsing<TOutput>): TOutput => {
  try {
    return schema.parse(value);
  } catch (error) {
    const message = safeThrownDetail(error);
    const locator = appendPathIssuePath(capability, payloadName, irPath, error);
    throw createLayoutProbeRecoverableError(
      `${capability} '${providerName}' failed ${payloadName} validation at ${formatPropertyPath(locator)}: ${message}`,
      { cause: error, providerKey: providerName },
    );
  }
};

/**
 * 执行扩展输出校验，将失败归为必须中止布局试算的契约错误
 * @template T 校验成功时原样返回的结果类型
 */
export const withProviderOutputValidationBoundary = <T>(owner: string, validate: () => T): T => {
  try {
    return validate();
  } catch (cause) {
    if (isCompositeContractError(cause) || isFatalProbeError(cause)) throw cause;
    throw createCompositeContractError(`${owner} output validation failed.`, { cause });
  }
};
