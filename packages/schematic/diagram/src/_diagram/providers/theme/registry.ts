import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { DiagramThemeDefinition } from '../../contract';

/** 组装 Diagram Theme registry */
export const resolveDiagramThemeRegistry = (
  custom: ReadonlyArray<DiagramThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, DiagramThemeDefinition> => {
  const registry = new Map<string, DiagramThemeDefinition>();

  for (const definition of custom ?? []) {
    assertNonEmptyString(
      definition.name,
      'Diagram theme',
      () =>
        new RetikzDiagramError({
          code: RetikzDiagramErrorCode.DefinitionInvalid,
          message: 'Diagram theme name must be a non-empty string.',
          details: { capability: 'diagram-theme', key: definition.name },
        }),
    );
    if (registry.has(definition.name)) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionDuplicate,
        message: `Diagram theme '${definition.name}' is already registered.`,
        details: {
          capability: 'diagram-theme',
          key: definition.name,
          availableKeys: [...registry.keys()],
        },
      });
    }

    registry.set(definition.name, definition);
  }

  return registry;
};
