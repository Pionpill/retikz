import type { GraphThemeDefinition } from '../../contract';
import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';

/** 注册 Graph Themes，并拒绝同名 definition */
export const resolveGraphThemeRegistry = (
  custom: ReadonlyArray<GraphThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, GraphThemeDefinition> => {
  const registry = new Map<string, GraphThemeDefinition>();

  for (const definition of custom ?? []) {
    if (registry.has(definition.name)) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.DefinitionDuplicate,
        message: `Graph theme '${definition.name}' is already registered.`,
        details: { capability: 'graph-theme', key: definition.name },
      });
    }

    registry.set(definition.name, definition);
  }

  return registry;
};
