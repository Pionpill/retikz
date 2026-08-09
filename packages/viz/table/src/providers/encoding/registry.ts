import type { AnyCellVisualScaleDefinition } from '../../contract';

import { assertTableNonEmptyString } from '../../shared';
import { BUILTIN_CELL_VISUAL_SCALES } from './definitions';

/** 合并内置与用户 Table Cell visual scale definitions */
export const resolveCellVisualScaleRegistry = (
  custom?: ReadonlyArray<AnyCellVisualScaleDefinition>,
): ReadonlyMap<string, AnyCellVisualScaleDefinition> => {
  const registry = new Map<string, AnyCellVisualScaleDefinition>();
  for (const definition of [...BUILTIN_CELL_VISUAL_SCALES, ...(custom ?? [])]) {
    assertTableNonEmptyString(definition.name, 'cell visual scale provider key must be a non-empty string');
    if (registry.has(definition.name)) {
      throw new Error(`duplicate cell visual scale registration: "${definition.name}"`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};

/** 从 registry 读取具名 Table Cell visual scale definition */
export const cellVisualScaleDefinitionOf = (
  name: string,
  registry: ReadonlyMap<string, AnyCellVisualScaleDefinition>,
): AnyCellVisualScaleDefinition => {
  const definition = registry.get(name);
  if (definition !== undefined) return definition;
  throw new Error(
    `Cell visual scale "${name}" is not registered; pass a definition via options.visualScaleDefinitions`,
  );
};
