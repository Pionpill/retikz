import type { TableThemeDefinition } from '../../contract';
import { RetikzTableError } from '../../error';

/** 合并内置与自定义 Table Themes，并拒绝同名 definition */
export const resolveTableThemeRegistry = (
  custom: ReadonlyArray<TableThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, TableThemeDefinition> => {
  const registry = new Map<string, TableThemeDefinition>();

  for (const definition of custom ?? []) {
    if (registry.has(definition.name)) {
      throw new RetikzTableError(`Table theme '${definition.name}' is already registered.`);
    }

    registry.set(definition.name, definition);
  }

  return registry;
};
