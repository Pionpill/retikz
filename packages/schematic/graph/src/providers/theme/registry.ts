import { assertNonEmptyString } from '@retikz/foundation';

import type { GraphThemeStyleDefinition } from '../../contract';

/** 注册 Graph Theme styles，并拒绝同名 definition */
export const resolveGraphThemeStyleRegistry = (
  custom: ReadonlyArray<GraphThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, GraphThemeStyleDefinition> => {
  const registry = new Map<string, GraphThemeStyleDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.name, 'Graph theme style');
    if (registry.has(definition.name)) {
      throw new Error(`Graph theme style '${definition.name}' is already registered.`);
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
