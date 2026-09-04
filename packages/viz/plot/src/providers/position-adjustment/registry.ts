import type { AnyPositionAdjustmentDefinition } from '../../contract';

import { extractPositionAdjustmentKind } from '../../contract';
import { RetikzPlotError } from '../../error';
import { jitterPositionAdjustment } from './jitter';

/** 内置 Position Adjustment definitions */
export const BUILTIN_POSITION_ADJUSTMENTS: ReadonlyArray<AnyPositionAdjustmentDefinition> = [jitterPositionAdjustment];

/** 合并内置与自定义 Position Adjustment registry */
export const resolvePositionAdjustmentRegistry = (
  custom?: ReadonlyArray<AnyPositionAdjustmentDefinition>,
): Map<string, AnyPositionAdjustmentDefinition> => {
  const registry = new Map<string, AnyPositionAdjustmentDefinition>();
  for (const definition of [...BUILTIN_POSITION_ADJUSTMENTS, ...(custom ?? [])]) {
    const kind = extractPositionAdjustmentKind(definition.schema);
    if (registry.has(kind)) {
      throw new RetikzPlotError(`lowerPlots: duplicate position adjustment registration: "${kind}"`);
    }
    registry.set(kind, definition);
  }
  return registry;
};
