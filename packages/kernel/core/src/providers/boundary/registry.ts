import type { BoundaryDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_BOUNDARIES } from './definitions';

export const resolveBoundaryRegistry = (
  boundaries?: ReadonlyArray<BoundaryDefinition>,
): ReadonlyMap<string, BoundaryDefinition> =>
  resolveProviderRegistry({
    capability: 'boundary',
    builtins: BUILTIN_BOUNDARIES,
    custom: boundaries,
    keyOf: definition => definition.name,
  });
