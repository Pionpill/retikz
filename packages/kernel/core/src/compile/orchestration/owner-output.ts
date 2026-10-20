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
  definition: { schema: { parse: (value: unknown) => unknown } } | undefined,
  observation: CompileObservationRuntime | undefined,
): Readonly<{
  keys: ReadonlyArray<string>;
  publisher: CompileOwnerOutputPublisher<JsonValue>;
  hasPublished: () => boolean;
  value: () => JsonValue | undefined;
}> => {
  const keys =
    definition === undefined || observation === undefined
      ? []
      : observation.select(Object.freeze({ owner, sourcePath }));
  let hasPublished = false;
  let published: JsonValue | undefined;
  const publisher: CompileOwnerOutputPublisher<JsonValue> = Object.freeze({
    requested: keys.length > 0,
    publish: value => {
      if (keys.length === 0) return;
      if (hasPublished) {
        throw createCompositeContractError(`Owner '${sourcePath}' published its compile output more than once.`);
      }

      if (definition === undefined) {
        throw createCompileInvariantError('internal: selected owner output has no definition');
      }

      let parsed: unknown;

      try {
        parsed = definition.schema.parse(value);
      } catch (cause) {
        throw createCompositeContractError(`Owner '${sourcePath}' returned an invalid owner output.`, { cause });
      }

      try {
        published = cloneAndFreezeJson(parsed, `Owner '${sourcePath}' output`) as JsonValue;
      } catch (cause) {
        throw createCompositeContractError(`Owner '${sourcePath}' returned a non-JSON owner output.`, { cause });
      }

      hasPublished = true;
    },
  });

  return { keys, publisher, hasPublished: () => hasPublished, value: () => published };
};
