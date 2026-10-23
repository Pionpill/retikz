import type { PlotThemeDefinition } from '../../contract';
import { RetikzPlotError } from '../../error';

/** 合并内置与自定义 Plot Themes，并拒绝同名 definition */
export const resolvePlotThemeRegistry = (
  custom: ReadonlyArray<PlotThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, PlotThemeDefinition> => {
  const registry = new Map<string, PlotThemeDefinition>();

  for (const definition of custom ?? []) {
    if (registry.has(definition.name)) {
      throw new RetikzPlotError(`Plot theme '${definition.name}' is already registered.`);
    }

    registry.set(definition.name, definition);
  }

  return registry;
};
