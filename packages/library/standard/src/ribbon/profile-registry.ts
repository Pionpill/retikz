import type { RibbonWidthProfileDefinition } from './profile-types';

/** 合并 Standard Ribbon 内置与调用方 profile，并拒绝同名冲突 */
export const resolveRibbonWidthProfileRegistry = (
  builtins: ReadonlyArray<RibbonWidthProfileDefinition>,
  custom: ReadonlyArray<RibbonWidthProfileDefinition> = [],
): ReadonlyMap<string, RibbonWidthProfileDefinition> => {
  const registry = new Map<string, RibbonWidthProfileDefinition>();
  for (const definition of [...builtins, ...custom]) {
    const previous = registry.get(definition.name);
    if (previous !== undefined && previous !== definition) {
      throw new Error(`Ribbon width profile '${definition.name}' is defined more than once.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
