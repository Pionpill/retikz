import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { FlowThemeDefinition } from '../../contract';

/** 组装 Flow Theme registry，同一 Definition identity 只保留一次 */
export const resolveFlowThemeRegistry = (
  custom: ReadonlyArray<FlowThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, FlowThemeDefinition> => {
  const registry = new Map<string, FlowThemeDefinition>();

  for (const definition of custom ?? []) {
    assertNonEmptyString(
      definition.name,
      'Flow theme',
      () =>
        new RetikzDiagramError({
          code: RetikzDiagramErrorCode.DefinitionInvalid,
          message: 'Flow theme name must be a non-empty string.',
          details: { capability: 'flow-theme', key: definition.name },
        }),
    );
    const existing = registry.get(definition.name);
    if (existing === definition) continue;
    if (existing !== undefined) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionDuplicate,
        message: `Flow theme '${definition.name}' is already registered.`,
        details: {
          capability: 'flow-theme',
          key: definition.name,
          availableKeys: [...registry.keys()],
        },
      });
    }

    registry.set(definition.name, definition);
  }

  return registry;
};
