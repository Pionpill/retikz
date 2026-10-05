import { DEFAULT_EPSILON, isFiniteNumber } from '@retikz/math';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import type { TransformContext, RowSelection, TransformSemanticContext } from '../../contract';
import { RetikzDataError } from '../../error';
import type {
  IRDataAnnotateSelector,
  IRDataAnnotateTransform,
  IRDataReducerOperation,
  IRDataSelectTransform,
  IRDataSummarizeTransform,
  IRDataBinTransform,
  IRDataRelateTransform,
  IRDataSelectorOperation,
} from '../../schemas';
import { ReducerOperationKind } from '../../schemas';
import type { ExternalRow } from '../../shared';
import { resolveFieldPath } from '../data';
import { applyReducerOperation, applySelectorOperation, reducerOutputFields } from '../statistics';
import { computeTransformValue, runTransformComputation } from './computation';
import type { TransformComputation } from './computation';
import { groupRowsByFields, finiteFieldValuesOf } from './shared';

/** 分组算法共享的计算调度，语义与实际同步/异步实现分离 */
export type GroupComputation = Readonly<{
  /** 对当前分组执行统计归约，允许同步或异步结果 */
  reduce: (rows: Array<ExternalRow>, operation: IRDataReducerOperation) => ExternalRow | Promise<ExternalRow>;
  /** 对当前分组执行行选择，允许同步或异步结果 */
  select: (
    rows: Array<ExternalRow>,
    operation: IRDataSelectorOperation,
  ) => Array<RowSelection> | Promise<Array<RowSelection>>;
}>;

const synchronousGroupComputation = (context: TransformContext): GroupComputation => ({
  reduce: (rows, operation) => applyReducerOperation(rows, operation, context),
  select: (rows, operation) => applySelectorOperation(rows, operation, context),
});

/** reducer 动态输出字段的运行时冲突约束 */
type ReducerOutputConstraints = {
  /** 不得被 reducer 覆盖的既有输出字段 */
  reservedFields?: ReadonlySet<string>;
  /** 冲突诊断中的既有字段来源 */
  reservedLabel?: string;
};

/** 在执行 reducer 前校验 definition 声明的动态输出字段 */
export const validateReducerMetrics = (
  metrics: ReadonlyArray<IRDataReducerOperation>,
  context: Pick<TransformSemanticContext, 'statisticsReducerRegistry'>,
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
function* computeReducerMetrics(
  rows: Array<ExternalRow>,
  metrics: ReadonlyArray<IRDataReducerOperation>,
  context: TransformContext,
  constraints: ReducerOutputConstraints = {},
  computation: GroupComputation = synchronousGroupComputation(context),
): TransformComputation<ExternalRow> {
  validateReducerMetrics(metrics, context, constraints);
  const out: ExternalRow = {};

  for (const metric of metrics)
    Object.assign(out, yield* computeTransformValue(() => computation.reduce(rows, metric)));

  return out;
}

/** 同步执行分组统计，保持所有调用方的同步返回 */
export const applyReducerMetrics = (
  rows: Array<ExternalRow>,
  metrics: ReadonlyArray<IRDataReducerOperation>,
  context: TransformContext,
  constraints: ReducerOutputConstraints = {},
): ExternalRow => runTransformComputation(computeReducerMetrics(rows, metrics, context, constraints));

/** 从 selector operation 中取出可回填的数值字段；rank-only selector 返回 undefined */
const selectorValueFieldOf = (selector: IRDataAnnotateSelector['selector']): string | undefined => {
  if (!('by' in selector)) return undefined;
  const field = selector.by;
  return typeof field === 'string' ? field : undefined;
};

/** 执行 annotate selector 并产出要广播到组内每一行的字段片段 */
function* computeSelectorAnnotations(
  rows: Array<ExternalRow>,
  operation: IRDataAnnotateTransform,
  context: TransformContext,
  computation: GroupComputation,
): TransformComputation<ExternalRow> {
  const out: ExternalRow = {};

  for (const annotation of operation.selectors ?? []) {
    const selections = yield* computeTransformValue(() => computation.select(rows, annotation.selector));
    if (selections.length === 0) continue;

    const selection = selections[0];
    const field = selectorValueFieldOf(annotation.selector);
    out[annotation.as] = field === undefined ? selection.rank : resolveFieldPath(selection.row, field);
  }

  return out;
}

/** summarize transform：按 groupBy 分组并执行多个 reducer，每组输出一行 */
export function* computeSummarize(
  rows: Array<ExternalRow>,
  operation: IRDataSummarizeTransform,
  context: TransformContext,
  computation: GroupComputation,
): TransformComputation<Array<ExternalRow>> {
  const output: Array<ExternalRow> = [];

  for (const group of groupRowsByFields(rows, operation.groupBy)) {
    output.push(
      context.groupProvenance(
        {
          ...group.values,
          ...(yield* computeReducerMetrics(
            group.rows,
            operation.metrics,
            context,
            {
              reservedFields: new Set(operation.groupBy ?? []),
              reservedLabel: 'a groupBy field',
            },
            computation,
          )),
        },
        group.rows,
      ),
    );
  }

  return output;
}

/** 同步执行分组归约，为每组生成聚合结果行 */
export const applySummarize = (
  rows: Array<ExternalRow>,
  operation: IRDataSummarizeTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  runTransformComputation(computeSummarize(rows, operation, context, synchronousGroupComputation(context)));

/** select transform：按 groupBy 分组并输出 selector 选中的原始行 */
export function* computeSelect(
  rows: Array<ExternalRow>,
  operation: IRDataSelectTransform,
  context: TransformContext,
  computation: GroupComputation,
): TransformComputation<Array<ExternalRow>> {
  const output: Array<ExternalRow> = [];

  for (const group of groupRowsByFields(rows, operation.groupBy)) {
    const selections = yield* computeTransformValue(() => computation.select(group.rows, operation.selector));
    output.push(
      ...selections.map(selection => ({
        ...selection.row,
        ...(operation.rankAs !== undefined && selection.rank !== undefined
          ? { [operation.rankAs]: selection.rank }
          : {}),
      })),
    );
  }

  return output;
}

/** 同步执行分组行选择，复制所选行并按需写入排名字段 */
export const applySelect = (
  rows: Array<ExternalRow>,
  operation: IRDataSelectTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  runTransformComputation(computeSelect(rows, operation, context, synchronousGroupComputation(context)));

/** annotate transform：按 groupBy 分组，把 reducer / selector 结果回填到组内每一行 */
export function* computeAnnotate(
  rows: Array<ExternalRow>,
  operation: IRDataAnnotateTransform,
  context: TransformContext,
  computation: GroupComputation,
): TransformComputation<Array<ExternalRow>> {
  const output: Array<ExternalRow> = [];

  for (const group of groupRowsByFields(rows, operation.groupBy)) {
    const metricFields =
      operation.metrics === undefined
        ? {}
        : yield* computeReducerMetrics(
            group.rows,
            operation.metrics,
            context,
            {
              reservedFields: new Set((operation.selectors ?? []).map(selector => selector.as)),
              reservedLabel: 'an annotate selector output field',
            },
            computation,
          );
    const selectorFields =
      operation.selectors === undefined
        ? {}
        : yield* computeSelectorAnnotations(group.rows, operation, context, computation);
    output.push(...group.rows.map(row => ({ ...row, ...metricFields, ...selectorFields })));
  }

  return output;
}

/** 同步计算分组统计与选择结果，并回填到组内每行的副本 */
export const applyAnnotate = (
  rows: Array<ExternalRow>,
  operation: IRDataAnnotateTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  runTransformComputation(computeAnnotate(rows, operation, context, synchronousGroupComputation(context)));

/** bin 默认输出字段名 */
const DEFAULT_BIN_START_FIELD = 'binStart';

const DEFAULT_BIN_END_FIELD = 'binEnd';

const DEFAULT_BIN_COUNT_FIELD = 'binCount';

/** bin 默认目标箱数 */
const DEFAULT_BIN_COUNT = 10;

/** bin 的边界输出字段名，validate 剔除派生字段时复用 */
export const binOutputFields = (operation: IRDataBinTransform): { startField: string; endField: string } => ({
  startField: operation.startField ?? DEFAULT_BIN_START_FIELD,
  endField: operation.endField ?? DEFAULT_BIN_END_FIELD,
});

/** bin 指标列表；缺省时用 count 指标产生默认频数列 */
export const binMetricOperations = (operation: IRDataBinTransform): NonNullable<IRDataBinTransform['metrics']> =>
  operation.metrics ?? [{ kind: ReducerOperationKind.Count, as: DEFAULT_BIN_COUNT_FIELD }];

/** 由策略计算分箱边界；count / step / thresholds 三策略互斥 */
const binEdges = (operation: IRDataBinTransform, values: Array<number>): Array<number> => {
  const strategies = [
    operation.count !== undefined,
    operation.step !== undefined,
    operation.thresholds !== undefined,
  ].filter(Boolean).length;
  if (strategies > 1) {
    throw new RetikzDataError(
      'data: bin transform strategies count / step / thresholds are mutually exclusive; set at most one',
    );
  }

  const [observedMin, observedMax] = values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 0];
  const [domainMin, domainMax] = operation.extent ?? [observedMin, observedMax];

  if (operation.thresholds !== undefined) {
    const interior = [...operation.thresholds]
      .sort((a, b) => a - b)
      .filter(threshold => threshold > domainMin && threshold < domainMax);
    return [domainMin, ...interior, domainMax];
  }

  if (operation.step !== undefined) {
    const step = operation.step;
    const span = domainMax - domainMin;
    const binCount = Math.max(1, Math.ceil(span / step - DEFAULT_EPSILON));
    const edges = Array.from({ length: binCount + 1 }, (_, i) => domainMin + i * step);
    if (span > 0) edges[binCount] = domainMax;

    return edges;
  }

  const count = operation.count ?? DEFAULT_BIN_COUNT;
  const nice = operation.nice ?? true;
  let [lo, hi] = [domainMin, domainMax];
  if (nice && operation.extent === undefined) {
    [lo, hi] = d3ScaleLinear().domain([domainMin, domainMax]).nice(count).domain() as [number, number];
  }

  if (hi - lo < 1e-12) hi = lo + 1;
  const width = (hi - lo) / count;
  const edges = Array.from({ length: count + 1 }, (_, i) => lo + i * width);
  edges[count] = hi;

  return edges;
};

/** 合并分桶内的 reducer 结果，保持分桶操作的字段覆盖语义 */
function* computeBinMetrics(
  rows: Array<ExternalRow>,
  metrics: ReadonlyArray<NonNullable<IRDataBinTransform['metrics']>[number]>,
  computation: GroupComputation,
): TransformComputation<ExternalRow> {
  const out: ExternalRow = {};

  for (const metric of metrics)
    Object.assign(out, yield* computeTransformValue(() => computation.reduce(rows, metric)));

  return out;
}

/**
 * bin：连续 field 分箱，输出每箱一行，包含空箱
 * @description 半开区间 [edge_i, edge_{i+1})，末箱包含上界；metrics 缺省输出 binCount
 */
export function* computeBin(
  rows: Array<ExternalRow>,
  operation: IRDataBinTransform,
  context: TransformContext,
  computation: GroupComputation,
): TransformComputation<Array<ExternalRow>> {
  if (rows.length === 0) return [];

  const { startField, endField } = binOutputFields(operation);
  const metrics = binMetricOperations(operation);
  const observed = finiteFieldValuesOf(rows, operation.field);
  const edges = binEdges(operation, observed);
  const binCount = edges.length - 1;
  const buckets: Array<Array<ExternalRow>> = Array.from({ length: binCount }, () => []);

  for (const row of rows) {
    const value = resolveFieldPath(row, operation.field);
    if (!isFiniteNumber(value)) continue;

    let index = -1;

    for (let i = 0; i < binCount; i++) {
      const lo = edges[i];
      const hi = edges[i + 1];
      if (value >= lo && (value < hi || (i === binCount - 1 && value <= hi))) {
        index = i;
        break;
      }
    }

    if (index >= 0) buckets[index].push(row);
  }

  const output: Array<ExternalRow> = [];

  for (const [i, members] of buckets.entries()) {
    const start = edges[i];
    const end = edges[i + 1];
    const out: ExternalRow = {
      [startField]: start,
      [endField]: end,
      [operation.field]: (start + end) / 2,
      ...(yield* computeBinMetrics(members, metrics, computation)),
    };
    output.push(context.groupProvenance(out, members));
  }

  return output;
}

/** 同步按指定策略分箱并计算每个箱的统计指标 */
export const applyBin = (
  rows: Array<ExternalRow>,
  operation: IRDataBinTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  runTransformComputation(computeBin(rows, operation, context, synchronousGroupComputation(context)));

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/** 返回 relation endpoint 投影写出的目标字段名 */
export const relationEndpointOutputField = (prefix: 'source' | 'target', suffix: string): string =>
  `${prefix}${capitalize(suffix)}`;

const endpointFieldsOf = (
  prefix: 'source' | 'target',
  projection: IRDataRelateTransform['source'],
  row: ExternalRow,
): ExternalRow => {
  const out: ExternalRow = {};

  for (const [suffix, sourceField] of Object.entries(projection.fields)) {
    out[relationEndpointOutputField(prefix, suffix)] = resolveFieldPath(row, sourceField);
  }

  return out;
};

const pairMeasureFieldsOf = (
  operation: IRDataRelateTransform,
  source: ExternalRow,
  target: ExternalRow,
): ExternalRow => {
  const out: ExternalRow = {};

  for (const measure of operation.measures ?? []) {
    const sourceValue = Number(resolveFieldPath(source, measure.field));
    const targetValue = Number(resolveFieldPath(target, measure.field));
    const delta = targetValue - sourceValue;
    out[measure.as] = delta;
    if (measure.labelAs !== undefined) {
      const prefix = measure.labelPrefix !== undefined && delta >= 0 ? measure.labelPrefix : '';
      out[measure.labelAs] = `${prefix}${delta}`;
    }
  }

  return out;
};

/** relate：按 groupBy 选择 source / target 行并输出 relation rows */
export function* computeRelate(
  rows: Array<ExternalRow>,
  operation: IRDataRelateTransform,
  context: TransformContext,
  computation: GroupComputation,
): TransformComputation<Array<ExternalRow>> {
  const output: Array<ExternalRow> = [];

  for (const group of groupRowsByFields(rows, operation.groupBy)) {
    const sources = yield* computeTransformValue(() => computation.select(group.rows, operation.source.selector));
    const targets = yield* computeTransformValue(() => computation.select(group.rows, operation.target.selector));
    if (sources.length === 0 || targets.length === 0) continue;

    const source = sources[0].row;
    const target = targets[0].row;
    output.push(
      context.groupProvenance(
        {
          ...group.values,
          ...endpointFieldsOf('source', operation.source, source),
          ...endpointFieldsOf('target', operation.target, target),
          ...pairMeasureFieldsOf(operation, source, target),
        },
        [source, target],
      ),
    );
  }

  return output;
}

/** 同步选取每组的首个源、目标结果，生成带端点字段、差值及来源的关系行 */
export const applyRelate = (
  rows: Array<ExternalRow>,
  operation: IRDataRelateTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  runTransformComputation(computeRelate(rows, operation, context, synchronousGroupComputation(context)));
