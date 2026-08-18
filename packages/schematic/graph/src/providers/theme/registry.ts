import { assertNonEmptyString } from '@retikz/foundation';

import type { GraphThemeStyleDefinition } from '../../contract';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';

/** 注册 Graph Theme styles，并拒绝同名 definition */
export const resolveGraphThemeStyleRegistry = (
  custom: ReadonlyArray<GraphThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, GraphThemeStyleDefinition> => {
  const registry = new Map<string, GraphThemeStyleDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.name, 'Graph theme style');
    if (registry.has(definition.name)) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.DefinitionDuplicate,
        message: `Graph theme style '${definition.name}' is already registered.`,
        details: { capability: 'graph-theme-style', key: definition.name },
      });
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
