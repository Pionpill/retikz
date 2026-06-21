import { scaleLinear as d3ScaleLinear } from 'd3-scale';
import { isFiniteNumber } from '@retikz/math';
import { type AggregateTransform, type BinTransform, type ExternalRow } from '../../schemas';
import { resolveFieldPath } from '../../features';
import type { TransformContext } from '../../contract';

/** bin 默认输出字段名，对齐 IntervalMark 的 x0Field / x1Field 消费方。 */
const DEFAULT_BIN_START_FIELD = 'binStart';
const DEFAULT_BIN_END_FIELD = 'binEnd';
const DEFAULT_BIN_VALUE_FIELD = 'binValue';

/** bin 默认目标箱数。 */
const DEFAULT_BIN_COUNT = 10;

/** bin 的输出字段名，validate 剔除派生字段时复用。 */
export const binOutputFields = (operation: BinTransform): { startField: string; endField: string; valueField: string } => ({
  startField: operation.startField ?? DEFAULT_BIN_START_FIELD,
  endField: operation.endField ?? DEFAULT_BIN_END_FIELD,
  valueField: operation.valueField ?? DEFAULT_BIN_VALUE_FIELD,
});

/** aggregate 输出字段名：as 缺省时 count -> count，否则 reduce + 首字母大写 field。 */
export const aggregateOutputField = (operation: AggregateTransform): string => {
  if (operation.as !== undefined) return operation.as;
  if (operation.reduce === 'count') return 'count';
  const field = operation.field ?? '';
  return `${operation.reduce}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
};

const reduceValues = (reduce: 'sum' | 'mean' | 'min' | 'max', values: Array<number>): number => {
  if (values.length === 0) return 0;
  if (reduce === 'sum') return values.reduce((a, b) => a + b, 0);
  if (reduce === 'mean') return values.reduce((a, b) => a + b, 0) / values.length;
  if (reduce === 'min') return Math.min(...values);
  return Math.max(...values);
};

/** 取一组行某字段的有限数值；规约只看有限值。 */
const finiteValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const out: Array<number> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) out.push(value);
  }
  return out;
};

/** 由策略计算分箱边界；count / step / thresholds 三策略互斥。 */
const binEdges = (operation: BinTransform, values: Array<number>): Array<number> => {
  const strategies = [operation.count !== undefined, operation.step !== undefined, operation.thresholds !== undefined].filter(Boolean).length;
  if (strategies > 1) {
    throw new Error('lowerPlots: bin transform strategies count / step / thresholds are mutually exclusive; set at most one');
  }
  const [observedMin, observedMax] = values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 0];
  const [domainMin, domainMax] = operation.extent ?? [observedMin, observedMax];

  if (operation.thresholds !== undefined) {
    const interior = [...operation.thresholds].sort((a, b) => a - b).filter(threshold => threshold > domainMin && threshold < domainMax);
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

/**
 * bin：连续 field 分箱，输出每箱一行，包含空箱。
 * @description 半开区间 [edge_i, edge_{i+1})，末箱包含上界；reduce=count 输出频数。
 */
export const applyBin = (rows: Array<ExternalRow>, operation: BinTransform, context: Pick<TransformContext, 'groupProvenance'>): Array<ExternalRow> => {
  if (operation.reduce !== undefined && operation.reduce !== 'count' && operation.reduceField === undefined) {
    throw new Error(`lowerPlots: bin transform reduce "${operation.reduce}" requires reduceField (the numeric field reduced per bin)`);
  }
  if (rows.length === 0) return [];
  const { startField, endField, valueField } = binOutputFields(operation);
  const reduce = operation.reduce ?? 'count';
  const observed = finiteValuesOf(rows, operation.field);
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
    const value = reduce === 'count' ? members.length : members.length === 0 ? 0 : reduceValues(reduce, finiteValuesOf(members, operation.reduceField as string));
    const out: ExternalRow = { [startField]: start, [endField]: end, [valueField]: value, [operation.field]: (start + end) / 2 };
    return context.groupProvenance(out, members);
  });
};

/**
 * aggregate：按 groupBy 全键分组并规约，每组输出一行。
 * @description 输出行携带 groupBy 键原值与规约值；provenance 开启时打组级源序标记。
 */
export const applyAggregate = (rows: Array<ExternalRow>, operation: AggregateTransform, context: Pick<TransformContext, 'groupProvenance'>): Array<ExternalRow> => {
  if (operation.reduce !== 'count' && operation.field === undefined) {
    throw new Error(`lowerPlots: aggregate transform reduce "${operation.reduce}" requires field (the numeric field reduced per group)`);
  }
  const as = aggregateOutputField(operation);
  const order: Array<string> = [];
  const groups = new Map<string, Array<ExternalRow>>();
  for (const row of rows) {
    const keyValues = operation.groupBy.map(field => resolveFieldPath(row, field));
    const key = JSON.stringify(keyValues.map(v => (v === undefined ? null : v)));
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else {
      order.push(key);
      groups.set(key, [row]);
    }
  }
  return order.map(key => {
    const members = groups.get(key) as Array<ExternalRow>;
    const first = members[0];
    const value = operation.reduce === 'count' ? members.length : reduceValues(operation.reduce, finiteValuesOf(members, operation.field as string));
    const carried: ExternalRow = {};
    for (const field of operation.groupBy) carried[field] = resolveFieldPath(first, field);
    return context.groupProvenance({ ...carried, [as]: value }, members);
  });
};
