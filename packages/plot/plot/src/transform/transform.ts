import { scaleLinear } from 'd3-scale';
import { isFiniteNumber } from '@retikz/math';
import {
  type AggregateTransform,
  type BinTransform,
  type DeriveIntervalTransform,
  type ExternalRow,
  type JitterTransform,
  type NormalizeTransform,
  PlotTransform,
  type SortTransform,
  type StackTransform,
  type Transform,
} from '../ir';
import type { FieldCollector } from '../data';
import { compareByPath, resolveFieldPath } from '../data/field';
import { SOURCE_INDICES, readSourceIndex } from '../pipeline/provenance';
import { inferCategoryDomain } from '../scale/scale';

/** 默认堆叠下 / 上界输出字段名（与 IntervalMark 的 y0Field / y1Field 默认对齐） */
const DEFAULT_START_FIELD = 'y0';
const DEFAULT_END_FIELD = 'y1';

/** bin 默认输出字段名（与 IntervalMark 的 x0Field / x1Field 消费方对齐） */
const DEFAULT_BIN_START_FIELD = 'binStart';
const DEFAULT_BIN_END_FIELD = 'binEnd';
const DEFAULT_BIN_VALUE_FIELD = 'binValue';
/** bin 默认目标箱数（无策略时） */
const DEFAULT_BIN_COUNT = 10;

/** 稳定排序：按字段升 / 降序（等键保持原序，JS Array.sort 稳定） */
const applySort = (rows: Array<ExternalRow>, op: SortTransform): Array<ExternalRow> => {
  const direction = op.order === 'descending' ? -1 : 1;
  return [...rows].sort((a, b) => direction * compareByPath(a, b, op.field));
};

/**
 * 堆叠：每个 x 分组内按系列顺序累加 y，给每行派生 [y0, y1]
 * @description 系列顺序 = groupBy 值的全局出现顺序（保序去重）；缺 y / 非有限按 0 计入（零高段、不跳过，避免后续累加错位）。
 *   输出保持输入行顺序，只追加 startField / endField 两字段。
 *   x 缺省 → 全行归一组（单链累积，喂饼图）；groupBy 缺省 → 按数据序累加（不重排组内）。
 */
const applyStack = (rows: Array<ExternalRow>, op: StackTransform): Array<ExternalRow> => {
  const startField = op.startField ?? DEFAULT_START_FIELD;
  const endField = op.endField ?? DEFAULT_END_FIELD;
  // groupBy 缺省：组内保持数据序（rankOf 恒等价 → 不重排）；有 groupBy：按系列全局出现序累加。
  const groupByField = op.groupBy;
  const seriesOrder = groupByField === undefined ? [] : inferCategoryDomain(rows.map(row => resolveFieldPath(row, groupByField)));
  const seriesRank = new Map(seriesOrder.map((series, index) => [series, index] as const));
  const rankOf = (row: ExternalRow): number => {
    if (groupByField === undefined) return 0;
    const series = resolveFieldPath(row, groupByField);
    if (typeof series !== 'string' && typeof series !== 'number') return seriesOrder.length;
    return seriesRank.get(series) ?? seriesOrder.length;
  };

  // 按 x 分组（x 值为 string | number 标量，Map 按值索引）；x 缺省 → 全行单链（同一固定 key）
  const groups = new Map<unknown, Array<ExternalRow>>();
  const SINGLE_CHAIN_KEY = Symbol('single-chain');
  for (const row of rows) {
    const key = op.x === undefined ? SINGLE_CHAIN_KEY : resolveFieldPath(row, op.x);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  // 每组内按系列序累加（稳定排序保留数据序），记录每行的 [y0, y1]
  const bounds = new Map<ExternalRow, [number, number]>();
  for (const groupRows of groups.values()) {
    const ordered = [...groupRows].sort((a, b) => rankOf(a) - rankOf(b));
    let cumulative = 0;
    for (const row of ordered) {
      const value = resolveFieldPath(row, op.y);
      const segment = isFiniteNumber(value) ? value : 0;
      const y0 = cumulative;
      const y1 = cumulative + segment;
      cumulative = y1;
      bounds.set(row, [y0, y1]);
    }
  }

  return rows.map(row => {
    const [y0, y1] = bounds.get(row) ?? [0, 0];
    return { ...row, [startField]: y0, [endField]: y1 };
  });
};

/** bin 的输出字段名（单一真源，validate 剔除派生字段时复用） */
export const binOutputFields = (op: BinTransform): { startField: string; endField: string; valueField: string } => ({
  startField: op.startField ?? DEFAULT_BIN_START_FIELD,
  endField: op.endField ?? DEFAULT_BIN_END_FIELD,
  valueField: op.valueField ?? DEFAULT_BIN_VALUE_FIELD,
});

/** aggregate 的输出字段名（as 缺省 = count → 'count'、否则 reduce + 首字母大写 field；单一真源，validate 复用） */
export const aggregateOutputField = (op: AggregateTransform): string => {
  if (op.as !== undefined) return op.as;
  if (op.reduce === 'count') return 'count';
  const field = op.field ?? '';
  return `${op.reduce}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
};

/** 一组数值规约（count 不走此函数；空 / 无有限值 → 0，对齐空箱 / 空组 valueField=0 约定） */
/** 收集 transform 读取的源字段，并登记 transform 派生输出字段以供 strict model 排除。 */
export const collectTransformFields = (transform: Transform, fields: FieldCollector, derivedOutputs: Set<string>): void => {
  switch (transform.kind) {
    case PlotTransform.Sort:
      fields.addField(transform.field);
      break;
    case PlotTransform.Stack:
      fields.addFields(transform.y, transform.x, transform.groupBy);
      derivedOutputs.add(transform.startField ?? DEFAULT_START_FIELD);
      derivedOutputs.add(transform.endField ?? DEFAULT_END_FIELD);
      break;
    case PlotTransform.Bin: {
      fields.addFields(transform.field, transform.reduceField);
      const out = binOutputFields(transform);
      derivedOutputs.add(out.startField);
      derivedOutputs.add(out.endField);
      derivedOutputs.add(out.valueField);
      break;
    }
    case PlotTransform.Aggregate:
      fields.addFields(...transform.groupBy, transform.field);
      derivedOutputs.add(aggregateOutputField(transform));
      break;
    case PlotTransform.Normalize:
      fields.addField(transform.field);
      if (transform.groupBy !== undefined) fields.addFields(...transform.groupBy);
      if (transform.as !== undefined) derivedOutputs.add(transform.as);
      break;
    case PlotTransform.DeriveInterval:
      fields.addFields(transform.from, transform.startFrom, transform.endFrom);
      derivedOutputs.add(transform.startField ?? DEFAULT_START_FIELD);
      derivedOutputs.add(transform.endField ?? DEFAULT_END_FIELD);
      break;
    case PlotTransform.Jitter:
      if (transform.axis === undefined || transform.axis === 'x' || transform.axis === 'both') fields.addField(transform.xField ?? 'x');
      if (transform.axis === 'y' || transform.axis === 'both') fields.addField(transform.yField ?? 'y');
      break;
  }
};

const reduceValues = (reduce: 'sum' | 'mean' | 'min' | 'max', values: Array<number>): number => {
  if (values.length === 0) return 0;
  if (reduce === 'sum') return values.reduce((a, b) => a + b, 0);
  if (reduce === 'mean') return values.reduce((a, b) => a + b, 0) / values.length;
  if (reduce === 'min') return Math.min(...values);
  return Math.max(...values);
};

/** 取一组行某字段的有限数值（非有限跳过；规约只看有限值，与 isFiniteNumber 守卫一致） */
const finiteValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const out: Array<number> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) out.push(value);
  }
  return out;
};

/** 取一组行的源行索引集合（best-effort，仅 provenance 开 / 源行已 tagSourceIndex 时非空） */
const sourceIndicesOf = (rows: Array<ExternalRow>): Array<number> => {
  const out: Array<number> = [];
  for (const row of rows) {
    const index = readSourceIndex(row);
    if (index !== undefined) out.push(index);
  }
  return out;
};

/** 给改行数 transform 的输出行打组级源序标记（组内有源索引才打，保 provenance 关时默认产物逐字节等价） */
const withGroupProvenance = (row: ExternalRow, members: Array<ExternalRow>): ExternalRow => {
  const indices = sourceIndicesOf(members);
  return indices.length > 0 ? { ...row, [SOURCE_INDICES]: indices } : row;
};

/** 由策略算分箱边界（升序 edge 数组，N 条边 = N-1 个箱）；三策略互斥、全缺默认 count */
const binEdges = (op: BinTransform, values: Array<number>): Array<number> => {
  const strategies = [op.count !== undefined, op.step !== undefined, op.thresholds !== undefined].filter(Boolean).length;
  if (strategies > 1) {
    throw new Error('lowerPlots: bin transform strategies count / step / thresholds are mutually exclusive; set at most one');
  }
  const [observedMin, observedMax] = values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 0];
  const [domainMin, domainMax] = op.extent ?? [observedMin, observedMax];

  // thresholds：显式内部边界 + extent 端点补齐 → K+1 箱（仅保留严格落在 (domainMin, domainMax) 内的边界，
  //   域外阈值会产生倒退 / 空箱、且让观测落空被丢，剔除之）
  if (op.thresholds !== undefined) {
    const interior = [...op.thresholds].sort((a, b) => a - b).filter(threshold => threshold > domainMin && threshold < domainMax);
    return [domainMin, ...interior, domainMax];
  }
  // step：从下界按固定箱宽平铺；箱数 = ceil(span / step)，边界用乘法（避免 += 累积漂移），末边顶到 domainMax（避免漂移丢上界观测）
  if (op.step !== undefined) {
    const step = op.step;
    const span = domainMax - domainMin;
    const binCount = Math.max(1, Math.ceil(span / step - 1e-9));
    const edges = Array.from({ length: binCount + 1 }, (_, i) => domainMin + i * step);
    if (edges[binCount] < domainMax) edges[binCount] = domainMax;
    return edges;
  }
  // count（默认）：nice 域后等分成 count 箱
  const count = op.count ?? DEFAULT_BIN_COUNT;
  const nice = op.nice ?? true;
  let [lo, hi] = [domainMin, domainMax];
  if (nice && op.extent === undefined) {
    [lo, hi] = scaleLinear().domain([domainMin, domainMax]).nice(count).domain() as [number, number];
  }
  if (hi - lo < 1e-12) hi = lo + 1; // 退化域（单值 / 全等）→ 给一个单位宽，避免零宽箱
  const width = (hi - lo) / count;
  const edges = Array.from({ length: count + 1 }, (_, i) => lo + i * width);
  edges[count] = hi; // 末边钉到 hi（乘法漂移可能让末边略短于 hi，导致 hi 处观测落空被丢）
  return edges;
};

/**
 * bin：连续 field 分箱 → 每箱一行（含空箱），携 [start, end] 边界 + 箱内规约值 + 箱代表值（field 中点）
 * @description 改行数（N 观测 → M 箱）。边界三策略互斥（thresholds > step > count，全缺默认 count 10、nice 对齐）；
 *   半开 [edge_i, edge_{i+1})、末箱含上界；reduce=count → 频数，sum/mean/min/max → 对 reduceField 规约（空箱 / 空组值 0）。
 *   provenance 开时给每箱输出行打组级源序标记（SOURCE_INDICES = 该箱命中的源行索引集合）。
 */
const applyBin = (rows: Array<ExternalRow>, op: BinTransform): Array<ExternalRow> => {
  if (op.reduce !== undefined && op.reduce !== 'count' && op.reduceField === undefined) {
    throw new Error(`lowerPlots: bin transform reduce "${op.reduce}" requires reduceField (the numeric field reduced per bin)`);
  }
  if (rows.length === 0) return [];
  const { startField, endField, valueField } = binOutputFields(op);
  const reduce = op.reduce ?? 'count';
  // 落箱依据：field 的有限观测值
  const observed = finiteValuesOf(rows, op.field);
  const edges = binEdges(op, observed);
  const binCount = edges.length - 1;
  // 每行落箱：edge_i ≤ v < edge_{i+1}，末箱含上界
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
 * aggregate：按 groupBy 全键分组 + 组内规约 → 每组一行（携组键 + 规约值）
 * @description 改行数（N 行 → M 组）。组按首次出现序稳定；count 不需 field，sum/mean/min/max 缺 field → fail-loud。
 *   输出行携 groupBy 各键原值（下游位置编码读组标识）+ as 规约值；provenance 开时打组级源序标记。
 */
const applyAggregate = (rows: Array<ExternalRow>, op: AggregateTransform): Array<ExternalRow> => {
  if (op.reduce !== 'count' && op.field === undefined) {
    throw new Error(`lowerPlots: aggregate transform reduce "${op.reduce}" requires field (the numeric field reduced per group)`);
  }
  const as = aggregateOutputField(op);
  // 复合键分组：稳定按首次出现序；key = groupBy 各字段值的 JSON 串
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
    // 组键原样携带（取组内首行的键值，组内同键恒等）
    const carried: ExternalRow = {};
    for (const field of op.groupBy) carried[field] = resolveFieldPath(first, field);
    return withGroupProvenance({ ...carried, [as]: value }, members);
  });
};

/** derive-interval 默认输出字段名（对齐 interval y0Field / y1Field、sector startField / endField 消费方） */
const DEFAULT_DERIVE_START_FIELD = 'y0';
const DEFAULT_DERIVE_END_FIELD = 'y1';
/** jitter 默认被抖字段名（连续数值位置字段） */
const DEFAULT_JITTER_X_FIELD = 'x';
const DEFAULT_JITTER_Y_FIELD = 'y';

/**
 * 确定性 PRNG：mulberry32（32 位、无依赖、单整数 seed 完全决定输出序列）
 * @description 同 seed 复现同序列 → vanilla SSR 与浏览器 hydration 抖出逐字节相同坐标（守 locator parity / 确定性）。
 */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * normalize：同组内各行 field / 组总和 → 组内占比（保行数）
 * @description groupBy 缺省 → 全行单组（对全局总和归一化）；basis percent → ×100；组和为 0 → 该组输出 0（不产 NaN）。
 *   as 缺省原位覆盖 field、否则写新字段。先 normalize 再 stack 即百分比堆叠（链顺序组合）。
 */
const applyNormalize = (rows: Array<ExternalRow>, op: NormalizeTransform): Array<ExternalRow> => {
  const outField = op.as ?? op.field;
  const scale = op.basis === 'percent' ? 100 : 1;
  // groupBy 复合键分组求和（缺省全行一组）
  const sums = new Map<string, number>();
  const keyOf = (row: ExternalRow): string =>
    op.groupBy === undefined ? '' : JSON.stringify(op.groupBy.map(field => resolveFieldPath(row, field) ?? null));
  for (const row of rows) {
    const value = resolveFieldPath(row, op.field);
    const segment = isFiniteNumber(value) ? value : 0;
    const key = keyOf(row);
    sums.set(key, (sums.get(key) ?? 0) + segment);
  }
  return rows.map(row => {
    const value = resolveFieldPath(row, op.field);
    const segment = isFiniteNumber(value) ? value : 0;
    const sum = sums.get(keyOf(row)) ?? 0;
    const share = sum === 0 ? 0 : (segment / sum) * scale;
    return { ...row, [outField]: share };
  });
};

/**
 * derive-interval：每行独立算 [start, end]（保行数；与 stack 跨行累积语义正交）
 * @description 两字段模式（startFrom + endFrom 皆设）优先；否则 from 模式 [baseline, from 值]（baseline 缺省 0）。
 *   皆无来源 → fail-loud。非有限值回退 baseline（同 stack 的非有限按 0 计口径）。输出 startField/endField 缺省 y0/y1。
 */
const applyDeriveInterval = (rows: Array<ExternalRow>, op: DeriveIntervalTransform): Array<ExternalRow> => {
  const startField = op.startField ?? DEFAULT_DERIVE_START_FIELD;
  const endField = op.endField ?? DEFAULT_DERIVE_END_FIELD;
  const baseline = op.baseline ?? 0;
  const twoField = op.startFrom !== undefined && op.endFrom !== undefined;
  if (!twoField && op.from === undefined) {
    throw new Error('lowerPlots: derive-interval transform requires either `from` (baseline→value) or both `startFrom` and `endFrom`');
  }
  const finiteOr = (value: unknown, fallback: number): number => (isFiniteNumber(value) ? value : fallback);
  return rows.map(row => {
    if (twoField) {
      const start = finiteOr(resolveFieldPath(row, op.startFrom as string), baseline);
      const end = finiteOr(resolveFieldPath(row, op.endFrom as string), baseline);
      return { ...row, [startField]: start, [endField]: end };
    }
    const end = finiteOr(resolveFieldPath(row, op.from as string), baseline);
    return { ...row, [startField]: baseline, [endField]: end };
  });
};

/**
 * jitter：给连续数值位置字段加确定性伪随机偏移（v1 仅数据空间 pre-scale；保行数）
 * @description 偏移 = (rng()·2−1)·amount（均匀 [-amount,+amount]）加在字段值上；rng 由 seed + mulberry32 重建、按行序推进
 *   → 同 spec + 同数据 → 同抖动序列（SSR / hydration 同坐标）。axis 决定抖 xField / yField / 两者；非有限值跳过偏移（仍消耗一次抽样保序）。
 */
const applyJitter = (rows: Array<ExternalRow>, op: JitterTransform): Array<ExternalRow> => {
  const axis = op.axis ?? 'x';
  const amount = op.amount ?? 1;
  const seed = op.seed ?? 0;
  const xField = op.xField ?? DEFAULT_JITTER_X_FIELD;
  const yField = op.yField ?? DEFAULT_JITTER_Y_FIELD;
  const jitterX = axis === 'x' || axis === 'both';
  const jitterY = axis === 'y' || axis === 'both';
  const rng = mulberry32(seed);
  const offset = (): number => (rng() * 2 - 1) * amount;
  // 抖字段值：非有限保持原值（仍消耗一次抽样以维持行序驱动的确定性）
  const perturb = (row: ExternalRow, field: string): unknown => {
    const delta = offset();
    const value = resolveFieldPath(row, field);
    return isFiniteNumber(value) ? value + delta : value;
  };
  return rows.map(row => {
    const next: ExternalRow = { ...row };
    if (jitterX) next[xField] = perturb(row, xField);
    if (jitterY) next[yField] = perturb(row, yField);
    return next;
  });
};

/**
 * 按声明顺序折叠应用一串 transform（rows → rows）
 * @description 纯函数：sort / stack / normalize / derive-interval / jitter 保行数，bin / aggregate 改行数（N → M）；数据值不进 IR。空 / 省略 → 原样返回。
 */
export const applyTransforms = (rows: Array<ExternalRow>, ops?: Array<Transform>): Array<ExternalRow> => {
  if (!ops || ops.length === 0) return rows;
  return ops.reduce((acc, op) => {
    switch (op.kind) {
      case PlotTransform.Sort:
        return applySort(acc, op);
      case PlotTransform.Stack:
        return applyStack(acc, op);
      case PlotTransform.Bin:
        return applyBin(acc, op);
      case PlotTransform.Aggregate:
        return applyAggregate(acc, op);
      case PlotTransform.Normalize:
        return applyNormalize(acc, op);
      case PlotTransform.DeriveInterval:
        return applyDeriveInterval(acc, op);
      case PlotTransform.Jitter:
        return applyJitter(acc, op);
    }
  }, rows);
};
