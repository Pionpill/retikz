import type { JsonValue } from '@retikz/foundation';

import type { CompileObservationOwner, CompileOwnerOutputPublisher } from '../../contract';
import { createCompositeContractError } from '../../resolve/diagnostics';
import { cloneAndFreezeJson } from '../../shared/json';
import { createCompileInvariantError } from '../probe-failure';
import type { CompileObservationRuntime } from './observation';

/** 为一个 owner site 创建按需产物 publisher，并记录被选中的 observer keys */
export const createOwnerOutputPublisher = (
  owner: CompileObservationOwner,
  sourcePath: string,
  enabled: boolean | undefined,
  observation: CompileObservationRuntime | undefined,
): Readonly<{
  keys: ReadonlyArray<string>;
  publisher: CompileOwnerOutputPublisher<JsonValue>;
  hasPublished: () => boolean;
  value: () => JsonValue | undefined;
}> => {
  const keys =
    enabled !== true || observation === undefined ? [] : observation.select(Object.freeze({ owner, sourcePath }));
  let hasPublished = false;
  let published: JsonValue | undefined;
  const publisher: CompileOwnerOutputPublisher<JsonValue> = Object.freeze({
    requested: keys.length > 0,
    publish: value => {
      if (keys.length === 0) return;
      if (hasPublished) {
        throw createCompositeContractError(`Owner '${sourcePath}' published its compile output more than once.`);
      }

      if (enabled !== true) {
        throw createCompileInvariantError('internal: selected owner output has no definition');
      }

      try {
        published = cloneAndFreezeJson(value, `Owner '${sourcePath}' output`);
      } catch (cause) {
        throw createCompositeContractError(`Owner '${sourcePath}' returned a non-JSON owner output.`, { cause });
      }

      hasPublished = true;
    },
  });

  return { keys, publisher, hasPublished: () => hasPublished, value: () => published };
};
