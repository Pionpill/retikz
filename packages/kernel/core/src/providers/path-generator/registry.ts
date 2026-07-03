import type { PathGeneratorDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_PATH_GENERATORS } from './definitions';

export const resolvePathGeneratorRegistry = (
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>,
): ReadonlyMap<string, PathGeneratorDefinition> =>
  resolveProviderRegistry({
    capability: 'path generator',
    builtins: BUILTIN_PATH_GENERATORS,
    custom: pathGenerators,
    keyOf: definition => definition.name,
  });
