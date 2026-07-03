import type { PathKindDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_PATH_KINDS } from './definitions';

const keyOfPathKind = (definition: PathKindDefinition): string => definition.schema.shape.kind.value;

export const resolvePathKindRegistry = (
  pathKinds?: ReadonlyArray<PathKindDefinition>,
): ReadonlyMap<string, PathKindDefinition> =>
  resolveProviderRegistry({
    capability: 'path kind',
    builtins: BUILTIN_PATH_KINDS,
    custom: pathKinds,
    keyOf: keyOfPathKind,
  });
