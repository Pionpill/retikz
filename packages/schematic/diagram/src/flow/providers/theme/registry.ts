import { assertNonEmptyString } from '@retikz/foundation';

import type { FlowThemeStyleDefinition } from '../../contract';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

/** 组装 Flow Theme style registry，同一 Definition identity 只保留一次 */
export const resolveFlowThemeStyleRegistry = (
  custom: ReadonlyArray<FlowThemeStyleDefinition> | undefined = undefined,
): ReadonlyMap<string, FlowThemeStyleDefinition> => {
  const registry = new Map<string, FlowThemeStyleDefinition>();
  for (const definition of custom ?? []) {
    try {
      assertNonEmptyString(definition.name, 'Flow theme style');
    } catch (cause) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionInvalid,
        message: 'Flow theme style name must be a non-empty string.',
        details: { capability: 'flow-theme-style', key: definition.name },
        cause,
      });
    }
    const existing = registry.get(definition.name);
    if (existing === definition) continue;
    if (existing !== undefined) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionDuplicate,
        message: `Flow theme style '${definition.name}' is already registered.`,
        details: {
          capability: 'flow-theme-style',
          key: definition.name,
          availableKeys: [...registry.keys()],
        },
      });
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
