import type { AnyPositionAdjustmentDefinition } from '../../contract';
import type { IRPlotPositionAdjustmentOperation } from '../../schemas';

/** 已解析并完成 Definition schema 校验的 Position Adjustment */
export type PositionAdjustmentOperationResolution = {
  /** 与操作种类匹配的运行时调整定义 */
  definition: AnyPositionAdjustmentDefinition;
  /** 已经通过该定义 schema 解析的操作 */
  operation: IRPlotPositionAdjustmentOperation;
};
