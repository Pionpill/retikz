import type { PathGeneratorDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';

export const BUILTIN_PATH_GENERATORS: ReadonlyArray<PathGeneratorDefinition> = [];

export const resolvePathGeneratorRegistry = (
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>,
): ReadonlyMap<string, PathGeneratorDefinition> =>
  resolveProviderRegistry({
    capability: 'path generator',
    builtins: BUILTIN_PATH_GENERATORS,
    custom: pathGenerators,
    keyOf: definition => definition.name,
    optionName: 'pathGenerators',
  });
