import type { ChartThemeStyleDefinition } from './definition';

/** 合并内置与自定义 Chart 主题样式，并拒绝同名定义 */
export const resolveChartThemeStyleRegistry = (
  custom: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, ChartThemeStyleDefinition> => {
  const registry = new Map<string, ChartThemeStyleDefinition>();
  for (const definition of custom ?? []) {
    if (registry.has(definition.name)) {
      throw new Error(`Chart theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
