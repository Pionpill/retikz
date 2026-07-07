import type { ExternalRow, TransformContext } from '@retikz/data';

import { applyReducerOperation, applySelectorOperation, finiteFieldValuesOf, groupRowsByFields, ReducerOperationKind, resolveFieldPath } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import type { BinTransform, RelateTransform } from '../../schemas';

/** bin 默认输出字段名，对齐 IntervalMark 的区间消费方。 */
const DEFAULT_BIN_START_FIELD = 'binStart';
const DEFAULT_BIN_END_FIELD = 'binEnd';
const DEFAULT_BIN_COUNT_FIELD = 'binCount';

/** bin 默认目标箱数。 */
const DEFAULT_BIN_COUNT = 10;

/** bin 的边界输出字段名，validate 剔除派生字段时复用。 */
export const binOutputFields = (operation: BinTransform): { startField: string; endField: string } => ({
  startField: operation.startField ?? DEFAULT_BIN_START_FIELD,
  endField: operation.endField ?? DEFAULT_BIN_END_FIELD,
});

/** bin 指标列表；缺省时用 count 指标产生默认频数列。 */
export const binMetricOperations = (operation: BinTransform): NonNullable<BinTransform['metrics']> =>
  operation.metrics ?? [{ op: ReducerOperationKind.Count, as: DEFAULT_BIN_COUNT_FIELD }];

/** 由策略计算分箱边界；count / step / thresholds 三策略互斥。 */
const binEdges = (operation: BinTransform, values: Array<number>): Array<number> => {
  const strategies = [
    operation.count !== undefined,
    operation.step !== undefined,
    operation.thresholds !== undefined,
  ].filter(Boolean).length;
  if (strategies > 1) {
    throw new Error(
      'lowerPlots: bin transform strategies count / step / thresholds are mutually exclusive; set at most one',
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
    const binCount = Math.max(1, Math.ceil(span / step - 1e-9));
    const edges = Array.from({ length: binCount + 1 }, (_, i) => domainMin + i * step);
    if (edges[binCount] < domainMax) edges[binCount] = domainMax;
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

const applyReducerMetrics = (
  rows: Array<ExternalRow>,
  metrics: ReadonlyArray<NonNullable<BinTransform['metrics']>[number]>,
  context: TransformContext,
): ExternalRow => {
  const out: ExternalRow = {};
  for (const metric of metrics) Object.assign(out, applyReducerOperation(rows, metric, context));
  return out;
};

/**
 * bin：连续 field 分箱，输出每箱一行，包含空箱。
 * @description 半开区间 [edge_i, edge_{i+1})，末箱包含上界；metrics 缺省输出 binCount。
 */
export const applyBin = (
  rows: Array<ExternalRow>,
  operation: BinTransform,
  context: TransformContext,
): Array<ExternalRow> => {
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
  return buckets.map((members, i) => {
    const start = edges[i];
    const end = edges[i + 1];
    const out: ExternalRow = {
      [startField]: start,
      [endField]: end,
      [operation.field]: (start + end) / 2,
      ...applyReducerMetrics(members, metrics, context),
    };
    return context.groupProvenance(out, members);
  });
};

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const relationEndpointOutputField = (prefix: 'source' | 'target', suffix: string): string =>
  `${prefix}${capitalize(suffix)}`;

const endpointFieldsOf = (
  prefix: 'source' | 'target',
  projection: RelateTransform['source'],
  row: ExternalRow,
): ExternalRow => {
  const out: ExternalRow = {};
  for (const [suffix, sourceField] of Object.entries(projection.fields)) {
    out[relationEndpointOutputField(prefix, suffix)] = resolveFieldPath(row, sourceField);
  }
  return out;
};

const pairMeasureFieldsOf = (operation: RelateTransform, source: ExternalRow, target: ExternalRow): ExternalRow => {
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

/** relate：按 groupBy 选择 source / target 行并输出 relation rows。 */
export const applyRelate = (
  rows: Array<ExternalRow>,
  operation: RelateTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).flatMap(group => {
    const sources = applySelectorOperation(group.rows, operation.source.selector, context);
    const targets = applySelectorOperation(group.rows, operation.target.selector, context);
    if (sources.length === 0 || targets.length === 0) return [];
    const source = sources[0].row;
    const target = targets[0].row;
    return [
      context.groupProvenance(
        {
          ...group.values,
          ...endpointFieldsOf('source', operation.source, source),
          ...endpointFieldsOf('target', operation.target, target),
          ...pairMeasureFieldsOf(operation, source, target),
        },
        [source, target],
      ),
    ];
  });
