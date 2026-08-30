import type { RefinementCtx, ZodType } from 'zod';

import { assertPlainDataContainers } from '@retikz/foundation';
import { NEVER, preprocess } from 'zod';

/** 在已确认 plain-data 的输入中定位第一个显式 undefined 字段 */
const findExplicitUndefined = (value: unknown, path: Array<PropertyKey> = []): Array<PropertyKey> | undefined => {
  if (value === undefined) return path;
  if (value === null || typeof value !== 'object') return undefined;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findExplicitUndefined(value[index], [...path, index]);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  for (const [key, child] of Object.entries(value)) {
    const found = findExplicitUndefined(child, [...path, key]);
    if (found !== undefined) return found;
  }
  return undefined;
};

/** 为 Diagram 持久化片段复用 plain-data 检查并拒绝显式 undefined */
export const withDiagramSourceInput = <TSchema extends ZodType>(
  schema: TSchema,
  label: string,
): ReturnType<typeof preprocess<unknown, TSchema>> =>
  preprocess((value, context: RefinementCtx) => {
    try {
      assertPlainDataContainers(value, label);
    } catch {
      context.addIssue({ code: 'custom', message: `${label} must contain only JSON-safe plain data containers.` });
      return NEVER;
    }

    const undefinedPath = findExplicitUndefined(value);
    if (undefinedPath !== undefined) {
      context.addIssue({
        code: 'custom',
        path: undefinedPath,
        message: `${label} must omit unset fields instead of using explicit undefined.`,
      });
      return NEVER;
    }
    return value;
  }, schema);

/** 判断一个已解析的稀疏对象至少包含一个字段 */
export const hasOwnFields = (value: Readonly<Record<string, unknown>>): boolean => Object.keys(value).length > 0;
