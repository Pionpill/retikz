import type { AnyChartThemeStyleDefinition } from './definition';

import { BUILTIN_CHART_THEME_STYLES } from './catalog';

/** 合并内置与自定义 Chart Theme styles，并拒绝同名 definition */
export const resolveChartThemeStyleRegistry = (
  custom: ReadonlyArray<AnyChartThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, AnyChartThemeStyleDefinition> => {
  const registry = new Map<string, AnyChartThemeStyleDefinition>();
  for (const definition of [...BUILTIN_CHART_THEME_STYLES, ...(custom ?? [])]) {
    if (registry.has(definition.name)) {
      throw new Error(`Chart theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
