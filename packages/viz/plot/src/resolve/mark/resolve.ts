import type { ExternalRow } from '@retikz/data';

import type { CoordinateFrame, FieldCollector, IntervalContext, MarkInstance, MarkInstanceInput } from '../../contract';
import { cellGeometryAnchor } from '../../contract';
import { RetikzPlotError } from '../../error';
import type { AnyMarkDefinition } from '../../providers';
import { cellAnchor, createFieldCollector, intervalCellGeometry, roleAnchor } from '../../providers';
import type { IRPlotMark } from '../../schemas';
import { BuiltinPlotMark } from '../../schemas';
import type { MarkOperationResolution, MarkResolveContext } from './types';

/** 返回内置图元对应的行为定义 */
export const resolveMarkDefinition = (mark: IRPlotMark, context: MarkResolveContext): AnyMarkDefinition =>
  context.registry[mark.type];

/** 用匹配 definition schema 解析 mark operation，产出 lowering 唯一消费结构 */
export const resolveMarkOperation = (mark: IRPlotMark, context: MarkResolveContext): MarkOperationResolution => {
  const definition = resolveMarkDefinition(mark, context);
  return { definition, operation: definition.schema.parse(mark) as IRPlotMark };
};

/** 通过已解析 mark definition 收集图元引用的源字段 */
export const collectMarkFields = (mark: IRPlotMark, fields: FieldCollector, context: MarkResolveContext): void => {
  const { definition, operation } = resolveMarkOperation(mark, context);
  definition.collectFields?.(operation as never, fields);
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
  if (operation.type === BuiltinPlotMark.Interval) {
    const geometry = intervalCellGeometry(operation, row, frame, intervalContext);
    return geometry === null ? null : cellGeometryAnchor(geometry);
  }

  if (definition.buildCell !== undefined) {
    return cellAnchor(definition.buildCell(operation as never, instance, frame, intervalContext), frame);
  }

  return roleAnchor(operation, row, frame);
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
export const isSingleMark = (mark: IRPlotMark, context: MarkResolveContext): boolean =>
  resolveMarkInstances(resolveMarkOperation(mark, context), []).kind === 'single';
