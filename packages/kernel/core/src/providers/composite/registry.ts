import type { CompositeDefinition } from '../../contract/composite';

import { resolveProviderRegistry } from '../registry';

export const BUILTIN_COMPOSITES: ReadonlyArray<CompositeDefinition> = [];

export const keyOfComposite = (definition: CompositeDefinition): string => `${definition.namespace}.${definition.type}`;

export const resolveCompositeRegistry = (
  composites?: ReadonlyArray<CompositeDefinition>,
): ReadonlyMap<string, CompositeDefinition> =>
  resolveProviderRegistry({
    capability: 'composite',
    builtins: BUILTIN_COMPOSITES,
    custom: composites,
    keyOf: keyOfComposite,
    optionName: 'composites',
  });
