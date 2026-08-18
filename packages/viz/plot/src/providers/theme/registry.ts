import type { PlotThemeStyleDefinition } from '../../contract';

import { RetikzPlotError } from '../../error';

/** 合并内置与自定义 Plot Theme styles，并拒绝同名 definition */
export const resolvePlotThemeStyleRegistry = (
  custom: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, PlotThemeStyleDefinition> => {
  const registry = new Map<string, PlotThemeStyleDefinition>();
  for (const definition of custom ?? []) {
    if (registry.has(definition.name)) {
      throw new RetikzPlotError(`Plot theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
