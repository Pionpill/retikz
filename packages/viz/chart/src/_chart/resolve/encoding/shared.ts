import type { IRJsonObject } from '@retikz/core';

import { RetikzChartError, RetikzChartErrorCode } from '../../../error';

/** 创建带精确 encoding 路径的 Chart IR 错误 */
export const invalidEncoding = (
  message: string,
  path: ReadonlyArray<string | number>,
  cause?: unknown,
): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidChartIR,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

/** 返回一个 recipe encoding slot 的 Source 路径 */
export const mappingPathOf = (slot: string): ReadonlyArray<string | number> => ['recipe', 'encodings', slot];

/** 把 JSON object value 收窄为 Chart resolver 可读对象 */
export const objectValueOf = (value: unknown): IRJsonObject | undefined => {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return undefined;
  return value as IRJsonObject;
};

/** 递归读取 direct field shorthand 或 direct mapping 中的字段 */
export const directFieldsOf = (value: unknown): ReadonlyArray<string> => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(item => directFieldsOf(item));
  const object = objectValueOf(value);
  return object !== undefined && typeof object.field === 'string' ? [object.field] : [];
};

/** 判断 exact mapping 的执行种类 */
export const mappingKindOf = (value: unknown): 'direct' | 'aggregate' | 'derived' | undefined => {
  if (typeof value === 'string') return 'direct';
  const object = objectValueOf(value);
  if (object === undefined) return undefined;
  if (Object.hasOwn(object, 'aggregate')) return 'aggregate';
  if (Object.hasOwn(object, 'transform')) return 'derived';
  if (Object.hasOwn(object, 'field')) return 'direct';
  return undefined;
};

/** 读取 mapping 的 scale binding 对象 */
export const mappingScaleOf = (value: unknown): IRJsonObject | undefined => {
  const mapping = objectValueOf(value);
  return mapping === undefined ? undefined : objectValueOf(mapping.scale);
};
