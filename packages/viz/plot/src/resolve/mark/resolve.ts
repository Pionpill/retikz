import type { ExternalRow } from '@retikz/data';

import { JsonObjectSchema } from '@retikz/core';

import type { AnyMarkDefinition, CoordinateFrame, FieldCollector, IntervalContext } from '../../contract';
import type { IRPlotMark, IRPlotMarkOperation } from '../../schemas';
import type { MarkOperationResolution, MarkResolveContext } from './types';

import { cellAnchor, roleAnchor } from '../../providers';

/** 查找 mark definition；未注册 type 会给出上下文明确的 fail-loud 诊断 */
export const resolveMarkDefinition = (mark: IRPlotMarkOperation, context: MarkResolveContext): AnyMarkDefinition => {
  const definition = context.registry.get(mark.type);
  if (definition === undefined) {
    throw new Error(
      `lowerPlots: mark type "${mark.type}" is not registered; pass a MarkDefinition via options.markDefinitions`,
    );
  }
  return definition;
};

/** 校验 mark JSON 形态与匹配 definition operation，产出 lowering 唯一消费结构 */
export const resolveMarkOperation = (
  mark: IRPlotMarkOperation,
  context: MarkResolveContext,
): MarkOperationResolution => {
  JsonObjectSchema.parse(mark);
  const definition = resolveMarkDefinition(mark, context);
  const operation = definition.schema.parse(mark) as IRPlotMarkOperation;
  JsonObjectSchema.parse(operation);
  return { definition, operation };
};

/** 通过已解析 mark definition 收集图元引用的源字段 */
export const collectMarkFields = (
  mark: IRPlotMarkOperation,
  fields: FieldCollector,
  context: MarkResolveContext,
): void => {
  const { definition, operation } = resolveMarkOperation(mark, context);
  definition.collectFields?.(operation as never, fields);
};

/** 返回已解析 mark definition 声明的可消费通道类型 */
export const channelKindsForMark = (
  mark: IRPlotMarkOperation,
  context: MarkResolveContext,
): ReturnType<NonNullable<AnyMarkDefinition['channelKinds']>> | undefined => {
  const { definition, operation } = resolveMarkOperation(mark, context);
  return definition.channelKinds?.(operation as never);
};

/** 解析 datum 锚点所需的 mark capability，并复用 provider 提供的 cell / role 几何投影 */
export const datumAnchor = (
  mark: IRPlotMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  context: MarkResolveContext,
  intervalContext?: IntervalContext,
): [number, number] | null => {
  const { definition, operation } = resolveMarkOperation(mark, context);
  if (definition.buildCell !== undefined) {
    return cellAnchor(definition.buildCell(operation as never, row, frame, intervalContext), frame);
  }
  return roleAnchor(operation as IRPlotMark, row, frame);
};
