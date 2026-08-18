import type {
  IRDataAnnotateSelector,
  IRDataAnnotateTransform,
  IRDataReducerOperation,
  IRDataSelectTransform,
  IRDataSummarizeTransform,
} from '../../schemas';
import type { ExternalRow } from '../../shared';

import { type TransformContext } from '../../contract';
import { RetikzDataError } from '../../error';
import { resolveFieldPath } from '../data';
import { applyReducerOperation, applySelectorOperation, reducerOutputFields } from '../statistics';
import { groupRowsByFields } from './shared';

/** reducer 动态输出字段的运行时冲突约束 */
type ReducerOutputConstraints = {
  /** 不得被 reducer 覆盖的既有输出字段 */
  reservedFields?: ReadonlySet<string>;
  /** 冲突诊断中的既有字段来源 */
  reservedLabel?: string;
};

/** 在执行 reducer 前校验 definition 声明的动态输出字段 */
const assertReducerOutputFields = (
  metrics: ReadonlyArray<IRDataReducerOperation>,
  context: TransformContext,
  constraints: ReducerOutputConstraints,
): void => {
  const seen = new Set<string>();
  for (const metric of metrics) {
    for (const field of reducerOutputFields(metric, context.statisticsReducerRegistry)) {
      if (constraints.reservedFields?.has(field) === true) {
        throw new RetikzDataError(
          `data: reducer output field "${field}" must not collide with ${constraints.reservedLabel ?? 'a reserved output field'}`,
        );
      }
      if (seen.has(field)) throw new RetikzDataError(`data: duplicate reducer output field "${field}"`);
      seen.add(field);
    }
  }
};

/** 对一组 rows 执行多个 reducer，并把每个 reducer 输出字段合并为同一行片段 */
export const applyReducerMetrics = (
  rows: Array<ExternalRow>,
  metrics: ReadonlyArray<IRDataReducerOperation>,
  context: TransformContext,
  constraints: ReducerOutputConstraints = {},
): ExternalRow => {
  assertReducerOutputFields(metrics, context, constraints);
  const out: ExternalRow = {};
  for (const metric of metrics) Object.assign(out, applyReducerOperation(rows, metric, context));
  return out;
};

/** 从 selector operation 中取出可回填的数值字段；rank-only selector 返回 undefined */
const selectorValueFieldOf = (selector: IRDataAnnotateSelector['selector']): string | undefined => {
  if (!('by' in selector)) return undefined;
  const field = selector.by;
  return typeof field === 'string' ? field : undefined;
};

/** 执行 annotate selector 并产出要广播到组内每一行的字段片段 */
const applySelectorAnnotations = (
  rows: Array<ExternalRow>,
  operation: IRDataAnnotateTransform,
  context: TransformContext,
): ExternalRow => {
  const out: ExternalRow = {};
  for (const annotation of operation.selectors ?? []) {
    const selections = applySelectorOperation(rows, annotation.selector, context);
    if (selections.length === 0) continue;
    const selection = selections[0];
    const field = selectorValueFieldOf(annotation.selector);
    out[annotation.as] = field === undefined ? selection.rank : resolveFieldPath(selection.row, field);
  }
  return out;
};

/** summarize transform：按 groupBy 分组并执行多个 reducer，每组输出一行 */
export const applySummarize = (
  rows: Array<ExternalRow>,
  operation: IRDataSummarizeTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).map(group =>
    context.groupProvenance(
      {
        ...group.values,
        ...applyReducerMetrics(group.rows, operation.metrics, context, {
          reservedFields: new Set(operation.groupBy ?? []),
          reservedLabel: 'a groupBy field',
        }),
      },
      group.rows,
    ),
  );

/** select transform：按 groupBy 分组并输出 selector 选中的原始行 */
export const applySelect = (
  rows: Array<ExternalRow>,
  operation: IRDataSelectTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).flatMap(group =>
    applySelectorOperation(group.rows, operation.selector, context).map(selection => ({
      ...selection.row,
      ...(operation.rankAs !== undefined && selection.rank !== undefined ? { [operation.rankAs]: selection.rank } : {}),
    })),
  );

/** annotate transform：按 groupBy 分组，把 reducer / selector 结果回填到组内每一行 */
export const applyAnnotate = (
  rows: Array<ExternalRow>,
  operation: IRDataAnnotateTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).flatMap(group => {
    const metricFields =
      operation.metrics === undefined
        ? {}
        : applyReducerMetrics(group.rows, operation.metrics, context, {
            reservedFields: new Set((operation.selectors ?? []).map(selector => selector.as)),
            reservedLabel: 'an annotate selector output field',
          });
    const selectorFields =
      operation.selectors === undefined ? {} : applySelectorAnnotations(group.rows, operation, context);
    return group.rows.map(row => ({ ...row, ...metricFields, ...selectorFields }));
  });
