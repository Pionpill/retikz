import { isFiniteNumber } from '@retikz/math';

import type { DeriveIntervalTransform, ExternalRow, JitterTransform, NormalizeTransform, SortTransform, StackOffsetValue, StackTransform } from '../../schemas';

import { PlotSortOrder, StackOffset as StackOffsetMode } from '../../schemas';
import { compareRowsByFieldPath, inferCategoryDomain, resolveFieldPath } from '../data';

/** 默认堆叠下界 / 上界输出字段名，对齐 IntervalMark 的 y0Field / y1Field 默认值。 */
export const DEFAULT_START_FIELD = 'y0';
export const DEFAULT_END_FIELD = 'y1';

/** derive-interval 默认输出字段名，对齐 interval y0Field / y1Field 与 sector startField / endField 消费方。 */
export const DEFAULT_DERIVE_START_FIELD = 'y0';
export const DEFAULT_DERIVE_END_FIELD = 'y1';

/** jitter 默认被扰动字段名：连续数值位置字段。 */
export const DEFAULT_JITTER_X_FIELD = 'x';
export const DEFAULT_JITTER_Y_FIELD = 'y';

/** 稳定排序：按字段升 / 降序；等键保持原序。 */
export const applySort = (rows: Array<ExternalRow>, operation: SortTransform): Array<ExternalRow> => {
  const direction = operation.order === PlotSortOrder.Descending ? -1 : 1;
  return [...rows].sort((a, b) => direction * compareRowsByFieldPath(a, b, operation.field));
};

/**
 * 堆叠：每个 x 分组内按系列顺序累加 y，给每行派生 [y0, y1]。
 * @description 系列顺序取 groupBy 值的全局出现序；缺 y / 非有限值按 0 计入，避免后续累计错位。
 */
export const applyStack = (rows: Array<ExternalRow>, operation: StackTransform): Array<ExternalRow> => {
  const startField = operation.startField ?? DEFAULT_START_FIELD;
  const endField = operation.endField ?? DEFAULT_END_FIELD;
  const offset: StackOffsetValue = operation.offset ?? StackOffsetMode.Zero;
  const groupByField = operation.groupBy;
  const seriesOrder =
    groupByField === undefined ? [] : inferCategoryDomain(rows.map(row => resolveFieldPath(row, groupByField)));
  const seriesRank = new Map(seriesOrder.map((series, index) => [series, index] as const));
  const rankOf = (row: ExternalRow): number => {
    if (groupByField === undefined) return 0;
    const series = resolveFieldPath(row, groupByField);
    if (typeof series !== 'string' && typeof series !== 'number') return seriesOrder.length;
    return seriesRank.get(series) ?? seriesOrder.length;
  };

  const groups = new Map<unknown, Array<ExternalRow>>();
  const SINGLE_CHAIN_KEY = Symbol('single-chain');
  for (const row of rows) {
    const key = operation.x === undefined ? SINGLE_CHAIN_KEY : resolveFieldPath(row, operation.x);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const stackGroupBounds = (ordered: Array<ExternalRow>): Map<ExternalRow, [number, number]> => {
    const values = ordered.map(row => {
      const value = resolveFieldPath(row, operation.y);
      return isFiniteNumber(value) ? value : 0;
    });
    const out = new Map<ExternalRow, [number, number]>();

    if (offset === StackOffsetMode.Overlap) {
      ordered.forEach((row, index) => out.set(row, [0, values[index] ?? 0]));
      return out;
    }

    if (offset === StackOffsetMode.Diverging) {
      let positive = 0;
      let negative = 0;
      ordered.forEach((row, index) => {
        const segment = values[index] ?? 0;
        if (segment >= 0) {
          out.set(row, [positive, positive + segment]);
          positive += segment;
        } else {
          out.set(row, [negative + segment, negative]);
          negative += segment;
        }
      });
      return out;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    const scale = offset === StackOffsetMode.Normalize ? (total === 0 ? 0 : 1 / total) : 1;
    let cumulative = offset === StackOffsetMode.Center ? (-total * scale) / 2 : 0;
    ordered.forEach((row, index) => {
      const segment = (values[index] ?? 0) * scale;
      const y0 = cumulative;
      const y1 = cumulative + segment;
      cumulative = y1;
      out.set(row, [y0, y1]);
    });
    return out;
  };

  const bounds = new Map<ExternalRow, [number, number]>();
  for (const groupRows of groups.values()) {
    const ordered = [...groupRows].sort((a, b) => rankOf(a) - rankOf(b));
    for (const [row, bound] of stackGroupBounds(ordered)) {
      bounds.set(row, bound);
    }
  }

  return rows.map(row => {
    const [y0, y1] = bounds.get(row) ?? [0, 0];
    return { ...row, [startField]: y0, [endField]: y1 };
  });
};

/**
 * normalize：同组内各行 field / 组总和 -> 组内占比，保持行数。
 * @description groupBy 缺省时全行单组；basis percent 输出 0..100，组和为 0 时输出 0。
 */
export const applyNormalize = (rows: Array<ExternalRow>, operation: NormalizeTransform): Array<ExternalRow> => {
  const outField = operation.as ?? operation.field;
  const scale = operation.basis === 'percent' ? 100 : 1;
  const sums = new Map<string, number>();
  const keyOf = (row: ExternalRow): string =>
    operation.groupBy === undefined
      ? ''
      : JSON.stringify(operation.groupBy.map(field => resolveFieldPath(row, field) ?? null));
  for (const row of rows) {
    const value = resolveFieldPath(row, operation.field);
    const segment = isFiniteNumber(value) ? value : 0;
    const key = keyOf(row);
    sums.set(key, (sums.get(key) ?? 0) + segment);
  }
  return rows.map(row => {
    const value = resolveFieldPath(row, operation.field);
    const segment = isFiniteNumber(value) ? value : 0;
    const sum = sums.get(keyOf(row)) ?? 0;
    const share = sum === 0 ? 0 : (segment / sum) * scale;
    return { ...row, [outField]: share };
  });
};

/**
 * derive-interval：每行独立算 [start, end]，保持行数。
 * @description 两字段模式 startFrom + endFrom 优先；否则 from 模式派生 [baseline, fromValue]。
 */
export const applyDeriveInterval = (
  rows: Array<ExternalRow>,
  operation: DeriveIntervalTransform,
): Array<ExternalRow> => {
  const startField = operation.startField ?? DEFAULT_DERIVE_START_FIELD;
  const endField = operation.endField ?? DEFAULT_DERIVE_END_FIELD;
  const baseline = operation.baseline ?? 0;
  const twoField = operation.startFrom !== undefined && operation.endFrom !== undefined;
  if (!twoField && operation.from === undefined) {
    throw new Error(
      'lowerPlots: derive-interval transform requires either `from` (baseline->value) or both `startFrom` and `endFrom`',
    );
  }
  const finiteOr = (value: unknown, fallback: number): number => (isFiniteNumber(value) ? value : fallback);
  return rows.map(row => {
    if (twoField) {
      const start = finiteOr(resolveFieldPath(row, operation.startFrom as string), baseline);
      const end = finiteOr(resolveFieldPath(row, operation.endFrom as string), baseline);
      return { ...row, [startField]: start, [endField]: end };
    }
    const end = finiteOr(resolveFieldPath(row, operation.from as string), baseline);
    return { ...row, [startField]: baseline, [endField]: end };
  });
};

/**
 * 确定性 PRNG：mulberry32。seed 相同则输出序列相同，保证 SSR / locator parity。
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
 * jitter：给连续数值位置字段加确定性伪随机偏移，保持行数。
 * @description 偏移发生在数据空间 pre-scale；非有限值保留原值，但仍消耗一次随机数保持行序确定性。
 */
export const applyJitter = (rows: Array<ExternalRow>, operation: JitterTransform): Array<ExternalRow> => {
  const axis = operation.axis ?? 'x';
  const amount = operation.amount ?? 1;
  const seed = operation.seed ?? 0;
  const xField = operation.xField ?? DEFAULT_JITTER_X_FIELD;
  const yField = operation.yField ?? DEFAULT_JITTER_Y_FIELD;
  const jitterX = axis === 'x' || axis === 'both';
  const jitterY = axis === 'y' || axis === 'both';
  const rng = mulberry32(seed);
  const offset = (): number => (rng() * 2 - 1) * amount;
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
