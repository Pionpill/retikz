import { assertNonEmptyString } from '@retikz/foundation';

import type { AnyCellPresentationDefinition } from '../../contract';

import { RetikzTableError } from '../../error';
import { BUILTIN_CELL_PRESENTATIONS } from './definitions';

/** 合并内置与用户 Cell presentation definitions */
export const resolveCellPresentationRegistry = (
  custom?: ReadonlyArray<AnyCellPresentationDefinition>,
): ReadonlyMap<string, AnyCellPresentationDefinition> => {
  const registry = new Map<string, AnyCellPresentationDefinition>();
  for (const definition of [...BUILTIN_CELL_PRESENTATIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.name, 'cell presentation provider key');
    if (registry.has(definition.name)) {
      throw new RetikzTableError(`duplicate cell presentation registration: "${definition.name}"`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};

/** 从 registry 读取具名 Cell presentation definition */
export const cellPresentationDefinitionOf = (
  name: string,
  registry: ReadonlyMap<string, AnyCellPresentationDefinition>,
): AnyCellPresentationDefinition => {
  const definition = registry.get(name);
  if (definition !== undefined) return definition;
  throw new RetikzTableError(
    `Cell presentation "${name}" is not registered; pass a definition via options.presentationDefinitions`,
  );
};
