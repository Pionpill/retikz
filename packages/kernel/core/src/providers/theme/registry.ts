import type { AnyThemeStyleDefinition } from '../../contract';

import { BUILTIN_THEME_STYLES } from './definitions';

/** 合并内置与自定义 Theme styles 并拒绝同名定义 */
export const resolveThemeStyleRegistry = (
  custom: ReadonlyArray<AnyThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, AnyThemeStyleDefinition> => {
  const registry = new Map<string, AnyThemeStyleDefinition>();
  for (const definition of [...BUILTIN_THEME_STYLES, ...(custom ?? [])]) {
    if (registry.has(definition.name)) {
      throw new Error(`Theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
