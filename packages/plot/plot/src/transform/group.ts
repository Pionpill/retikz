import { scaleLinear } from 'd3-scale';
import { isFiniteNumber } from '@retikz/math';
import { type AggregateTransform, type BinTransform, type ExternalRow } from '../ir';
import { resolveFieldPath } from '../data';
import { SOURCE_INDICES, readSourceIndex } from '../pipeline/provenance';

/** bin 默认输出字段名，对齐 IntervalMark 的 x0Field / x1Field 消费方。 */
const DEFAULT_BIN_START_FIELD = 'binStart';
const DEFAULT_BIN_END_FIELD = 'binEnd';
const DEFAULT_BIN_VALUE_FIELD = 'binValue';

/** bin 默认目标箱数。 */
const DEFAULT_BIN_COUNT = 10;

/** bin 的输出字段名，validate 剔除派生字段时复用。 */
export const binOutputFields = (op: BinTransform): { startField: string; endField: string; valueField: string } => ({
  startField: op.startField ?? DEFAULT_BIN_START_FIELD,
  endField: op.endField ?? DEFAULT_BIN_END_FIELD,
  valueField: op.valueField ?? DEFAULT_BIN_VALUE_FIELD,
});

/** aggregate 输出字段名：as 缺省时 count -> count，否则 reduce + 首字母大写 field。 */
export const aggregateOutputField = (op: AggregateTransform): string => {
  if (op.as !== undefined) return op.as;
  if (op.reduce === 'count') return 'count';
  const field = op.field ?? '';
  return `${op.reduce}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
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

/** 取一组行的源行索引集合；仅 provenance 开启且源行已 tagSourceIndex 时非空。 */
const sourceIndicesOf = (rows: Array<ExternalRow>): Array<number> => {
  const out: Array<number> = [];
  for (const row of rows) {
    const index = readSourceIndex(row);
    if (index !== undefined) out.push(index);
  }
  return out;
};

/** 给改行数 transform 的输出行打组级源序标记。 */
const withGroupProvenance = (row: ExternalRow, members: Array<ExternalRow>): ExternalRow => {
  const indices = sourceIndicesOf(members);
  return indices.length > 0 ? { ...row, [SOURCE_INDICES]: indices } : row;
};

/** 由策略计算分箱边界；count / step / thresholds 三策略互斥。 */
const binEdges = (op: BinTransform, values: Array<number>): Array<number> => {
  const strategies = [op.count !== undefined, op.step !== undefined, op.thresholds !== undefined].filter(Boolean).length;
  if (strategies > 1) {
    throw new Error('lowerPlots: bin transform strategies count / step / thresholds are mutually exclusive; set at most one');
  }
  const [observedMin, observedMax] = values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 0];
  const [domainMin, domainMax] = op.extent ?? [observedMin, observedMax];

  if (op.thresholds !== undefined) {
    const interior = [...op.thresholds].sort((a, b) => a - b).filter(threshold => threshold > domainMin && threshold < domainMax);
    return [domainMin, ...interior, domainMax];
  }
  if (op.step !== undefined) {
    const step = op.step;
    const span = domainMax - domainMin;
    const binCount = Math.max(1, Math.ceil(span / step - 1e-9));
    const edges = Array.from({ length: binCount + 1 }, (_, i) => domainMin + i * step);
    if (edges[binCount] < domainMax) edges[binCount] = domainMax;
    return edges;
  }
  const count = op.count ?? DEFAULT_BIN_COUNT;
  const nice = op.nice ?? true;
  let [lo, hi] = [domainMin, domainMax];
  if (nice && op.extent === undefined) {
    [lo, hi] = scaleLinear().domain([domainMin, domainMax]).nice(count).domain() as [number, number];
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
export const applyBin = (rows: Array<ExternalRow>, op: BinTransform): Array<ExternalRow> => {
  if (op.reduce !== undefined && op.reduce !== 'count' && op.reduceField === undefined) {
    throw new Error(`lowerPlots: bin transform reduce "${op.reduce}" requires reduceField (the numeric field reduced per bin)`);
  }
  if (rows.length === 0) return [];
  const { startField, endField, valueField } = binOutputFields(op);
  const reduce = op.reduce ?? 'count';
  const observed = finiteValuesOf(rows, op.field);
  const edges = binEdges(op, observed);
  const binCount = edges.length - 1;
  const buckets: Array<Array<ExternalRow>> = Array.from({ length: binCount }, () => []);
  for (const row of rows) {
    const value = resolveFieldPath(row, op.field);
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
    const value = reduce === 'count' ? members.length : members.length === 0 ? 0 : reduceValues(reduce, finiteValuesOf(members, op.reduceField as string));
    const out: ExternalRow = { [startField]: start, [endField]: end, [valueField]: value, [op.field]: (start + end) / 2 };
    return withGroupProvenance(out, members);
  });
};

/**
 * aggregate：按 groupBy 全键分组并规约，每组输出一行。
 * @description 输出行携带 groupBy 键原值与规约值；provenance 开启时打组级源序标记。
 */
export const applyAggregate = (rows: Array<ExternalRow>, op: AggregateTransform): Array<ExternalRow> => {
  if (op.reduce !== 'count' && op.field === undefined) {
    throw new Error(`lowerPlots: aggregate transform reduce "${op.reduce}" requires field (the numeric field reduced per group)`);
  }
  const as = aggregateOutputField(op);
  const order: Array<string> = [];
  const groups = new Map<string, Array<ExternalRow>>();
  for (const row of rows) {
    const keyValues = op.groupBy.map(field => resolveFieldPath(row, field));
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
    const value = op.reduce === 'count' ? members.length : reduceValues(op.reduce, finiteValuesOf(members, op.field as string));
    const carried: ExternalRow = {};
    for (const field of op.groupBy) carried[field] = resolveFieldPath(first, field);
    return withGroupProvenance({ ...carried, [as]: value }, members);
  });
};
