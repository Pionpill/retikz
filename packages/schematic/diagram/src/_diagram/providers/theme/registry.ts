import { assertNonEmptyString } from '@retikz/foundation';

import type { DiagramThemeStyleDefinition } from '../../contract';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

/** 组装 Diagram Theme style registry */
export const resolveDiagramThemeStyleRegistry = (
  custom: ReadonlyArray<DiagramThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, DiagramThemeStyleDefinition> => {
  const registry = new Map<string, DiagramThemeStyleDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(
      definition.name,
      'Diagram theme style',
      new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionInvalid,
        message: 'Diagram theme style name must be a non-empty string.',
        details: { capability: 'diagram-theme-style', key: definition.name },
      }),
    );
    if (registry.has(definition.name)) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionDuplicate,
        message: `Diagram theme style '${definition.name}' is already registered.`,
        details: {
          capability: 'diagram-theme-style',
          key: definition.name,
          availableKeys: [...registry.keys()],
        },
      });
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
