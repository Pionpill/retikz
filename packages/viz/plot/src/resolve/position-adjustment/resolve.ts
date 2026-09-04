import { JsonObjectSchema } from '@retikz/core';

import type { AnyPositionAdjustmentDefinition } from '../../contract';
import type { IRPlotPositionAdjustmentOperation } from '../../schemas';
import type { PositionAdjustmentOperationResolution } from './types';

import { RetikzPlotError } from '../../error';

/** 查找并校验 Position Adjustment operation */
export const resolvePositionAdjustmentOperation = (
  operation: IRPlotPositionAdjustmentOperation,
  registry: ReadonlyMap<string, AnyPositionAdjustmentDefinition>,
): PositionAdjustmentOperationResolution => {
  JsonObjectSchema.parse(operation);
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: position adjustment kind "${operation.kind}" is not registered; pass a PositionAdjustmentDefinition via options.positionAdjustmentDefinitions`,
    );
  }
  const parsed = definition.schema.parse(operation) as IRPlotPositionAdjustmentOperation;
  JsonObjectSchema.parse(parsed);
  return { definition, operation: parsed };
};
