import type { CompositeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_COMPOSITES } from './definitions';

const keyOfComposite = (definition: CompositeDefinition): string => `${definition.namespace}.${definition.type}`;

export const resolveCompositeRegistry = (
  composites?: ReadonlyArray<CompositeDefinition>,
): ReadonlyMap<string, CompositeDefinition> =>
  resolveProviderRegistry({
    capability: 'composite',
    builtins: BUILTIN_COMPOSITES,
    custom: composites,
    keyOf: keyOfComposite,
  });
