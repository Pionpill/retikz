import type { RibbonWidthProfileDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';

export const BUILTIN_RIBBON_WIDTH_PROFILES: ReadonlyArray<RibbonWidthProfileDefinition> = [];

export const resolveRibbonWidthProfileRegistry = (
  profiles?: ReadonlyArray<RibbonWidthProfileDefinition>,
): ReadonlyMap<string, RibbonWidthProfileDefinition> =>
  resolveProviderRegistry({
    capability: 'ribbon width profile',
    builtins: BUILTIN_RIBBON_WIDTH_PROFILES,
    custom: profiles,
    keyOf: definition => definition.name,
  });
