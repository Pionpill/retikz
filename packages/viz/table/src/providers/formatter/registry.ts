import type { AnyCellFormatterDefinition } from '../../contract';

import { assertTableNonEmptyString } from '../../shared';
import { BUILTIN_CELL_FORMATTERS } from './definitions';

/** 合并内置与用户 Cell formatter definitions */
export const resolveCellFormatterRegistry = (
  custom?: ReadonlyArray<AnyCellFormatterDefinition>,
): ReadonlyMap<string, AnyCellFormatterDefinition> => {
  const registry = new Map<string, AnyCellFormatterDefinition>();
  for (const definition of [...BUILTIN_CELL_FORMATTERS, ...(custom ?? [])]) {
    assertTableNonEmptyString(definition.name, 'cell formatter provider key must be a non-empty string');
    if (registry.has(definition.name)) {
      throw new Error(`duplicate cell formatter registration: "${definition.name}"`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};

/** 从 registry 读取具名 Cell formatter definition */
export const cellFormatterDefinitionOf = (
  name: string,
  registry: ReadonlyMap<string, AnyCellFormatterDefinition>,
): AnyCellFormatterDefinition => {
  const definition = registry.get(name);
  if (definition !== undefined) return definition;
  throw new Error(`Cell formatter "${name}" is not registered; pass a definition via options.formatterDefinitions`);
};
