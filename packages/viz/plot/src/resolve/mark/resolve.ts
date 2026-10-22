import type { ExternalRow } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';

import type {
  MarkInstanceInput,
  MarkInstance,
  AnyMarkDefinition,
  CoordinateFrame,
  FieldCollector,
  IntervalContext,
} from '../../contract';
import { cellGeometryAnchor } from '../../contract';
import { RetikzPlotError } from '../../error';
import { createFieldCollector, cellAnchor, intervalCellGeometry, roleAnchor } from '../../providers';
import type { IRPlotMark, IRPlotMarkOperation } from '../../schemas';
import { isBuiltinMark, BuiltinPlotMark } from '../../schemas';
import type { MarkOperationResolution, MarkResolveContext } from './types';

/** 查找 mark definition；未注册 type 会给出上下文明确的 fail-loud 诊断 */
export const resolveMarkDefinition = (mark: IRPlotMarkOperation, context: MarkResolveContext): AnyMarkDefinition => {
  const definition = context.registry.get(mark.type);
  if (definition === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: mark type "${mark.type}" is not registered; pass a MarkDefinition via options.definitions.marks`,
    );
  }

  return definition;
};

/** 用匹配 definition schema 解析 mark operation，产出 lowering 唯一消费结构 */
export const resolveMarkOperation = (
  mark: IRPlotMarkOperation,
  context: MarkResolveContext,
): MarkOperationResolution => {
  const definition = resolveMarkDefinition(mark, context);
  const { defaultColorGroup, contributeToDomain, ...definitionOperation } = mark;
  const schema = definition.schema;
  const resolved = schema.parse(definitionOperation) as IRPlotMarkOperation;
  const operation =
    defaultColorGroup === undefined
      ? resolved
      : { ...resolved, defaultColorGroup: NonBlankStringSchema.parse(defaultColorGroup) };

  return {
    definition,
    operation: { ...operation, ...(contributeToDomain === undefined ? {} : { contributeToDomain }) },
  };
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
  instance: Extract<MarkInstance, { kind: 'row' }>,
  frame: CoordinateFrame,
  context: MarkResolveContext,
  intervalContext?: IntervalContext,
): [number, number] | null => {
  const { row } = instance;
  const { definition, operation } = resolveMarkOperation(mark, context);
  if (isBuiltinMark(operation) && operation.type === BuiltinPlotMark.Interval) {
    const geometry = intervalCellGeometry(operation, row, frame, intervalContext);
    return geometry === null ? null : cellGeometryAnchor(geometry);
  }

  if (definition.buildCell !== undefined) {
    return cellAnchor(definition.buildCell(operation as never, instance, frame, intervalContext), frame);
  }

  return roleAnchor(operation as IRPlotMark, row, frame);
};

/** 按 Definition 声明的有效字段消费者确定实例来源 */
export const resolveMarkInstances = (
  resolution: MarkOperationResolution,
  rows: Array<ExternalRow>,
): MarkInstanceInput => {
  const fields = new Set<string>();
  resolution.definition.collectFields?.(resolution.operation as never, createFieldCollector(fields));
  if (fields.size > 0) return { kind: 'rows', rows };
  if ((resolution.operation.transforms?.length ?? 0) > 0)
    throw new RetikzPlotError('Mark-local transforms require an effective field consumer');
  return { kind: 'single' };
};

/** 在数据变换准备阶段解析实例来源，不提前读取结果行 */
export const isSingleMark = (mark: IRPlotMarkOperation, context: MarkResolveContext): boolean =>
  resolveMarkInstances(resolveMarkOperation(mark, context), []).kind === 'single';
