import type { ExternalRow } from '@retikz/data';

import { inferCategoryDomain, resolveFieldPath } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type {
  IRPlotDeriveIntervalTransform,
  IRPlotJitterTransform,
  IRPlotNormalizeTransform,
  IRPlotStackTransform,
  StackOffsetValue,
} from '../../schemas';

import { JitterAxis, NormalizeBasis, StackOffset } from '../../schemas';

/** 默认堆叠下界 / 上界输出字段名，对齐 IntervalMark 的 y0Field / y1Field 默认值 */
export const DEFAULT_START_FIELD = 'y0';
/** stack transform 默认上界输出字段名 */
export const DEFAULT_END_FIELD = 'y1';

/** derive-interval 默认输出字段名，对齐 interval y0Field / y1Field 与 sector startField / endField 消费方 */
export const DEFAULT_DERIVE_START_FIELD = 'y0';
/** derive-interval transform 默认终点输出字段名 */
export const DEFAULT_DERIVE_END_FIELD = 'y1';

/** jitter 默认被扰动字段名：连续数值位置字段 */
export const DEFAULT_JITTER_X_FIELD = 'x';
/** jitter transform 默认 y 轴输出字段名 */
export const DEFAULT_JITTER_Y_FIELD = 'y';

/**
 * 堆叠：每个 x 分组内按系列顺序累加 y，给每行派生 [y0, y1]。
 * @description 系列顺序取 groupBy 值的全局出现序；缺 y / 非有限值按 0 计入；normalize offset 拒绝有限负值
 */
export const applyStack = (rows: Array<ExternalRow>, operation: IRPlotStackTransform): Array<ExternalRow> => {
  const startField = operation.startField ?? DEFAULT_START_FIELD;
  const endField = operation.endField ?? DEFAULT_END_FIELD;
  const offset: StackOffsetValue = operation.offset ?? StackOffset.Zero;
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

    if (offset === StackOffset.Normalize && values.some(value => value < 0)) {
      throw new Error(
        `lowerPlots: stack transform offset "normalize" does not support negative values in field "${operation.y}"; use offset "diverging" for signed data`,
      );
    }

    if (offset === StackOffset.Overlap) {
      ordered.forEach((row, index) => out.set(row, [0, values[index] ?? 0]));
      return out;
    }

    if (offset === StackOffset.Diverging) {
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
    const scale = offset === StackOffset.Normalize ? (total === 0 ? 0 : 1 / total) : 1;
    let cumulative = offset === StackOffset.Center ? (-total * scale) / 2 : 0;
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
 * @description groupBy 缺省时全行单组；有限负值会报错，缺失 / 非有限值按 0；basis percent 输出 0..100，组和为 0 时输出 0
 */
export const applyNormalize = (rows: Array<ExternalRow>, operation: IRPlotNormalizeTransform): Array<ExternalRow> => {
  const outField = operation.as ?? operation.field;
  const scale = operation.basis === NormalizeBasis.Percent ? 100 : 1;
  const sums = new Map<string, number>();
  const keyOf = (row: ExternalRow): string =>
    operation.groupBy === undefined
      ? ''
      : JSON.stringify(operation.groupBy.map(field => resolveFieldPath(row, field) ?? null));
  for (const row of rows) {
    const value = resolveFieldPath(row, operation.field);
    if (isFiniteNumber(value) && value < 0) {
      throw new Error(
        `lowerPlots: normalize transform does not support negative values in field "${operation.field}"; handle signed data before normalization`,
      );
    }
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
 * @description 两字段模式 startFrom + endFrom 优先；否则 from 模式派生 [baseline, fromValue]
 */
export const applyDeriveInterval = (
  rows: Array<ExternalRow>,
  operation: IRPlotDeriveIntervalTransform,
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
 * 确定性 PRNG：mulberry32。seed 相同则输出序列相同，保证 SSR / locator parity
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
 * @description 偏移发生在数据空间 pre-scale；非有限值保留原值，但仍消耗一次随机数保持行序确定性
 */
export const applyJitter = (rows: Array<ExternalRow>, operation: IRPlotJitterTransform): Array<ExternalRow> => {
  const axis = operation.axis ?? JitterAxis.X;
  const amount = operation.amount ?? 1;
  const seed = operation.seed ?? 0;
  const xField = operation.xField ?? DEFAULT_JITTER_X_FIELD;
  const yField = operation.yField ?? DEFAULT_JITTER_Y_FIELD;
  const jitterX = axis === JitterAxis.X || axis === JitterAxis.Both;
  const jitterY = axis === JitterAxis.Y || axis === JitterAxis.Both;
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
