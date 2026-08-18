import { assertNonEmptyString } from '@retikz/foundation';

import type { PathGeneratorDefinition } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/**
 * 定义 path generator 注册项，并做轻量形态校验
 * @remarks generator 输出的 JSON-safe 校验仍由 compile 阶段负责
 * @throws 当 name、paramsSchema、generate 或 targetParams 形态非法时
 */
export const definePathGenerator = (def: PathGeneratorDefinition): PathGeneratorDefinition => {
  if (typeof def.name !== 'string')
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'definePathGenerator: name must be a non-empty string.');
  assertNonEmptyString(def.name, 'definePathGenerator: name');
  const schema = def.paramsSchema as { safeParse?: unknown } | null | undefined;
  if (schema === null || typeof schema !== 'object' || typeof schema.safeParse !== 'function') {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'definePathGenerator: paramsSchema must be a zod schema (with a safeParse method).',
    );
  }
  if (typeof def.generate !== 'function') {
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'definePathGenerator: generate must be a function.');
  }
  if (
    def.targetParams !== undefined &&
    (!Array.isArray(def.targetParams) || def.targetParams.some(key => typeof key !== 'string'))
  ) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'definePathGenerator: targetParams must be an array of top-level param key strings.',
    );
  }
  return def;
};
