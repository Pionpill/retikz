import type { RibbonWidthProfileDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_RIBBON_WIDTH_PROFILES } from './definitions';

export const resolveRibbonWidthProfileRegistry = (
  profiles?: ReadonlyArray<RibbonWidthProfileDefinition>,
): ReadonlyMap<string, RibbonWidthProfileDefinition> =>
  resolveProviderRegistry({
    capability: 'ribbon width profile',
    builtins: BUILTIN_RIBBON_WIDTH_PROFILES,
    custom: profiles,
    keyOf: definition => definition.name,
  });
