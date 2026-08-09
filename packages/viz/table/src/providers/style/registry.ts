import type { TableThemeStyleDefinition } from '../../contract';

import { BUILTIN_TABLE_THEME_STYLES } from './definitions';

/** 合并内置与自定义 Table Theme styles，并拒绝同名 definition */
export const resolveTableThemeStyleRegistry = (
  custom: ReadonlyArray<TableThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, TableThemeStyleDefinition> => {
  const registry = new Map<string, TableThemeStyleDefinition>();
  for (const definition of [...BUILTIN_TABLE_THEME_STYLES, ...(custom ?? [])]) {
    if (registry.has(definition.name)) {
      throw new Error(`Table theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
