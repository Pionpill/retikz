import { ZodType } from 'zod';

import type { AnyCompositeDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CoreComputationOptions } from './public';

/** 复制 Computation 配置中的 records/arrays，保留 callback 与 schema identity */
const copyConfigValue = <T>(value: T, ancestors: ReadonlySet<object>): T => {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (typeof value === 'function') return value;
  if (value instanceof ZodType) return value;
  if (ancestors.has(value))
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      'createCoreComputation: options must not contain cyclic plain data',
    );

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    return value.map(item => copyConfigValue(item, nextAncestors)) as T;
  }

  const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>;
  for (const [key, item] of Object.entries(value)) copy[key] = copyConfigValue(item, nextAncestors);
  return copy as T;
};

/** 隔离 factory 输入与 Computation 生命周期配置的所有权 */
export const copyCoreComputationOptions = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CoreComputationOptions<TComposites>,
): CoreComputationOptions<TComposites> => {
  const copied = copyConfigValue<CoreComputationOptions<TComposites>>(
    { ...options, compositeInputs: undefined },
    new Set(),
  );
  if (options.compositeInputs !== undefined) copied.compositeInputs = options.compositeInputs;
  return copied;
};
