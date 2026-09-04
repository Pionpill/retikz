import type { AnyPositionAdjustmentDefinition } from '../../contract';
import type { IRPlotPositionAdjustmentOperation } from '../../schemas';

/** 已解析并完成 Definition schema 校验的 Position Adjustment */
export type PositionAdjustmentOperationResolution = {
  definition: AnyPositionAdjustmentDefinition;
  operation: IRPlotPositionAdjustmentOperation;
};
