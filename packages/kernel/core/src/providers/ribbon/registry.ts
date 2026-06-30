import type { RibbonWidthProfileDefinition } from '../../contract/ribbon';

export const BUILTIN_RIBBON_WIDTH_PROFILES: Record<string, RibbonWidthProfileDefinition> = {};

export const resolveRibbonWidthProfileRegistry = (
  profiles?: Partial<Record<string, RibbonWidthProfileDefinition>>,
): Partial<Record<string, RibbonWidthProfileDefinition>> => profiles ?? BUILTIN_RIBBON_WIDTH_PROFILES;
