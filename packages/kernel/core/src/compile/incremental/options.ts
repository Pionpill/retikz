import { ZodType } from 'zod';

import type { AnyCompositeDefinition } from '../../contract';
import type { CoreProgramOptions } from './public';

/** 复制 Program 配置中的 records/arrays，保留 callback 与 schema identity */
const copyConfigValue = <T>(value: T, ancestors: ReadonlySet<object>): T => {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (typeof value === 'function') return value;
  if (value instanceof ZodType) return value;
  if (ancestors.has(value)) throw new Error('createCoreProgram: options must not contain cyclic plain data');

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    return value.map(item => copyConfigValue(item, nextAncestors)) as T;
  }

  const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>;
  for (const [key, item] of Object.entries(value)) copy[key] = copyConfigValue(item, nextAncestors);
  return copy as T;
};

/** 隔离 factory 输入与 Program 生命周期配置的所有权 */
export const copyCoreProgramOptions = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CoreProgramOptions<TComposites>,
): CoreProgramOptions<TComposites> => {
  const copied = copyConfigValue(options, new Set());
  if (options.themeTokenDefinitions === undefined) return copied;
  return Object.freeze({
    ...copied,
    themeTokenDefinitions: Object.freeze([...options.themeTokenDefinitions]),
  });
};
