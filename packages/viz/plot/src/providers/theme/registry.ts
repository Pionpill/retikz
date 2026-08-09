import type { AnyPlotThemeStyleDefinition } from '../../contract';

import { BUILTIN_PLOT_THEME_STYLES } from './definitions';

/** 合并内置与自定义 Plot Theme styles，并拒绝同名 definition */
export const resolvePlotThemeStyleRegistry = (
  custom: ReadonlyArray<AnyPlotThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, AnyPlotThemeStyleDefinition> => {
  const registry = new Map<string, AnyPlotThemeStyleDefinition>();
  for (const definition of [...BUILTIN_PLOT_THEME_STYLES, ...(custom ?? [])]) {
    if (registry.has(definition.name)) {
      throw new Error(`Plot theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
