import { assertNonEmptyString } from '@retikz/foundation';

import type { GraphThemeDefinition } from '../../contract';
import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';

/** 注册 Graph Themes，并拒绝同名 definition */
export const resolveGraphThemeRegistry = (
  custom: ReadonlyArray<GraphThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, GraphThemeDefinition> => {
  const registry = new Map<string, GraphThemeDefinition>();

  for (const definition of custom ?? []) {
    assertNonEmptyString(
      definition.name,
      'Graph theme',
      () =>
        new RetikzGraphError({
          code: RetikzGraphErrorCode.DefinitionConflict,
          message: 'Graph theme name must be a non-empty string.',
          details: {
            capability: 'graph-theme',
            key: definition.name,
            reason: 'Graph theme name must be a non-empty string.',
          },
        }),
    );
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
