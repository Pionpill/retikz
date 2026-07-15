import type { IRDataScalarValue } from '@retikz/data';

import { coerceTimestamp } from '@retikz/data';
import { DEFAULT_EPSILON } from '@retikz/math';
import { format as d3Format } from 'd3-format';
import { utcFormat as d3UtcFormat } from 'd3-time-format';

import type { PositionScale, TickSet } from '../../../contract';
import type { GuideTickTimeUnitValue } from '../../../schemas';

import { AxisTickDensityKind, GuideTickIntervalKind, GuideTickTimeUnit } from '../../../schemas';

const MAX_INTERVAL_TICKS = 10_000;

/** axis guide 的刻度来源配置 */
export type GuideTickSourceInput = {
  /** 目标刻度数；由 scale 自己决定最终刻度值 */
  count?: number;
  /** 显式刻度值；分类 scale 可用字符串，数值 / 时间 scale 会先校验并归一化 */
  values?: Array<string | number>;
  /** 固定间隔候选 tick source；优先级低于 values，高于 count */
  interval?:
    | { kind: typeof GuideTickIntervalKind.Number; step: number; anchor?: number }
    | {
        kind: typeof GuideTickIntervalKind.Time;
        unit: GuideTickTimeUnitValue;
        step?: number;
        anchor?: string | number;
      }
    | { kind: typeof GuideTickIntervalKind.Category; step: number; offset?: number };
  /** 候选 tick 到可见 tick 的抽样策略 */
  density?:
    | { kind: typeof AxisTickDensityKind.All }
    | { kind: typeof AxisTickDensityKind.Sample; maxCount?: number; minGap?: number; preserveEnds?: boolean };
};

/** axis guide 的刻度标签格式化配置 */
export type GuideTickLabelFormatInput = {
  /** d3-format 或 d3-time-format 风格格式字符串；未知 tickKind 的自定义 scale 保留原标签 */
  format?: string;
};

const normalizeExplicitTick = (scale: PositionScale, value: string | number): IRDataScalarValue => {
  if (scale.tickKind === 'category') return value;
  if (scale.tickKind === 'time') {
    const stamp = coerceTimestamp(value);
    if (stamp === null) {
      throw new Error(
        `lowerPlots: time guide tick value must be an epoch millisecond or ISO-like string (got "${value}")`,
      );
    }
    return stamp;
  }
  if (scale.tickKind === undefined) return value;
  if (typeof value !== 'number') {
    throw new Error(`lowerPlots: numeric guide tick value must be a number (got "${value}")`);
  }
  return value;
};

const formatLabel = (
  scale: PositionScale,
  format: string | undefined,
  value: IRDataScalarValue,
  fallback: string,
): string => {
  if (format === undefined || scale.tickKind === undefined || scale.tickKind === 'category') return fallback;
  if (scale.tickKind === 'time') return d3UtcFormat(format)(new Date(Number(value)));
  return d3Format(format)(Number(value));
};

const intervalDomain = (scale: PositionScale): [number, number] => {
  const domain = scale.domain();
  const start = Number(domain[0]);
  const end = Number(domain[domain.length - 1]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('lowerPlots: fixed guide tick interval requires a finite scale domain');
  }
  return start <= end ? [start, end] : [end, start];
};

const numberIntervalTicks = (scale: PositionScale, step: number, anchor: number | undefined): Array<number> => {
  if (scale.tickKind !== 'number') {
    throw new Error(
      `lowerPlots: number guide tick interval requires a numeric scale (got "${scale.tickKind ?? 'unknown'}")`,
    );
  }
  const [lo, hi] = intervalDomain(scale);
  const base = anchor ?? lo;
  const values: Array<number> = [];
  const first = base + Math.ceil((lo - base) / step) * step;
  const epsilon = Math.abs(step) * DEFAULT_EPSILON;
  for (let value = first; value <= hi + epsilon; value += step) {
    if (values.length >= MAX_INTERVAL_TICKS) {
      throw new Error(`lowerPlots: guide tick interval generated more than ${MAX_INTERVAL_TICKS} candidate ticks`);
    }
    if (values.length > 0 && value === values[values.length - 1]) {
      throw new Error('lowerPlots: guide tick interval step is too small to make numeric progress');
    }
    values.push(Number(value.toFixed(12)));
  }
  return values;
};

const TIME_UNIT_MS: Record<'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week', number> = {
  [GuideTickTimeUnit.Millisecond]: 1,
  [GuideTickTimeUnit.Second]: 1000,
  [GuideTickTimeUnit.Minute]: 60_000,
  [GuideTickTimeUnit.Hour]: 3_600_000,
  [GuideTickTimeUnit.Day]: 86_400_000,
  [GuideTickTimeUnit.Week]: 604_800_000,
};

const addUtcMonths = (stamp: number, months: number): number => {
  const date = new Date(stamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
};

const addTimeInterval = (stamp: number, unit: GuideTickTimeUnitValue, step: number): number => {
  if (unit in TIME_UNIT_MS) return stamp + TIME_UNIT_MS[unit as keyof typeof TIME_UNIT_MS] * step;
  if (unit === GuideTickTimeUnit.Month) return addUtcMonths(stamp, step);
  if (unit === GuideTickTimeUnit.Quarter) return addUtcMonths(stamp, step * 3);
  return addUtcMonths(stamp, step * 12);
};

const timeIntervalTicks = (
  scale: PositionScale,
  unit: GuideTickTimeUnitValue,
  step: number,
  anchor: string | number | undefined,
): Array<number> => {
  if (scale.tickKind !== 'time') {
    throw new Error(
      `lowerPlots: time guide tick interval requires a time scale (got "${scale.tickKind ?? 'unknown'}")`,
    );
  }
  const [lo, hi] = intervalDomain(scale);
  const anchorStamp = anchor === undefined ? lo : coerceTimestamp(anchor);
  if (anchorStamp === null) {
    throw new Error(
      `lowerPlots: time guide tick interval anchor must be an epoch millisecond or ISO-like string (got "${anchor}")`,
    );
  }
  let value = anchorStamp;
  let guard = 0;
  while (value > lo) {
    if (guard >= MAX_INTERVAL_TICKS) {
      throw new Error(`lowerPlots: guide tick interval generated more than ${MAX_INTERVAL_TICKS} candidate ticks`);
    }
    const previous = value;
    value = addTimeInterval(value, unit, -step);
    if (value === previous) {
      throw new Error('lowerPlots: guide tick interval step is too small to make time progress');
    }
    guard += 1;
  }
  while (addTimeInterval(value, unit, step) <= lo) {
    if (guard >= MAX_INTERVAL_TICKS) {
      throw new Error(`lowerPlots: guide tick interval generated more than ${MAX_INTERVAL_TICKS} candidate ticks`);
    }
    const next = addTimeInterval(value, unit, step);
    if (next === value) {
      throw new Error('lowerPlots: guide tick interval step is too small to make time progress');
    }
    value = next;
    guard += 1;
  }
  const values: Array<number> = [];
  while (value <= hi) {
    if (values.length >= MAX_INTERVAL_TICKS) {
      throw new Error(`lowerPlots: guide tick interval generated more than ${MAX_INTERVAL_TICKS} candidate ticks`);
    }
    if (value >= lo) values.push(value);
    const next = addTimeInterval(value, unit, step);
    if (next === value) {
      throw new Error('lowerPlots: guide tick interval step is too small to make time progress');
    }
    value = next;
    guard += 1;
  }
  return values;
};

const categoryIntervalTicks = (
  scale: PositionScale,
  step: number,
  offset: number | undefined,
): Array<string | number> => {
  if (scale.tickKind !== 'category') {
    throw new Error(
      `lowerPlots: category guide tick interval requires a category scale (got "${scale.tickKind ?? 'unknown'}")`,
    );
  }
  const values = scale
    .domain()
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .filter((_, index) => index >= (offset ?? 0) && (index - (offset ?? 0)) % step === 0);
  if (values.length > MAX_INTERVAL_TICKS) {
    throw new Error(`lowerPlots: guide tick interval generated more than ${MAX_INTERVAL_TICKS} candidate ticks`);
  }
  return values;
};

const resolveIntervalValues = (
  scale: PositionScale,
  source: NonNullable<GuideTickSourceInput['interval']>,
): Array<IRDataScalarValue> => {
  if (source.kind === GuideTickIntervalKind.Number) return numberIntervalTicks(scale, source.step, source.anchor);
  if (source.kind === GuideTickIntervalKind.Time)
    return timeIntervalTicks(scale, source.unit, source.step ?? 1, source.anchor);
  return categoryIntervalTicks(scale, source.step, source.offset);
};

/**
 * 解析 axis guide 使用的刻度值和标签。
 * @description 优先消费显式 ticks.values；否则委托 PositionScale.ticks。格式化按 tickKind 选择数字 / 时间 formatter，分类和未知 tickKind 保留原标签。
 */
export const resolveGuideTicks = (
  scale: PositionScale,
  source?: GuideTickSourceInput,
  labelFormat?: GuideTickLabelFormatInput,
): TickSet => {
  if (source?.values !== undefined) {
    const values = source.values.map(value => normalizeExplicitTick(scale, value));
    const labels = values.map((value, index) =>
      formatLabel(scale, labelFormat?.format, value, String(source.values?.[index] ?? value)),
    );
    return { values, labels };
  }

  if (source?.interval !== undefined) {
    const values = resolveIntervalValues(scale, source.interval);
    return {
      values,
      labels: values.map(value => formatLabel(scale, labelFormat?.format, value, String(value))),
    };
  }

  const ticks = scale.ticks(source?.count);
  if (labelFormat?.format === undefined) return ticks;
  return {
    values: ticks.values,
    labels: ticks.values.map((value, index) => formatLabel(scale, labelFormat.format, value, ticks.labels[index])),
  };
};

const pickSampleIndices = (indices: ReadonlyArray<number>, maxCount: number, preserveEnds: boolean): Array<number> => {
  if (indices.length <= maxCount) return [...indices];
  if (maxCount === 1) return [indices[0]];
  if (!preserveEnds) {
    const step = Math.ceil(indices.length / maxCount);
    return indices.filter((_, index) => index % step === 0).slice(0, maxCount);
  }
  const picked = new Set<number>([indices[0], indices[indices.length - 1]]);
  const slots = maxCount - 1;
  for (let slot = 1; slot < slots; slot += 1) {
    picked.add(indices[Math.round((slot * (indices.length - 1)) / slots)]);
  }
  return [...picked].sort((a, b) => a - b).slice(0, maxCount);
};

/** 按 density 把候选 tick set 抽样成 visible tick set。 */
export const resolveVisibleGuideTicks = (
  ticks: TickSet,
  source: GuideTickSourceInput | undefined,
  coordinate: (value: IRDataScalarValue) => number,
): TickSet => {
  const density = source?.density;
  if (density === undefined || density.kind === AxisTickDensityKind.All || ticks.values.length <= 1) return ticks;
  const preserveEnds = density.preserveEnds ?? true;
  let indices = ticks.values.map((_, index) => index);
  if (density.minGap !== undefined) {
    const kept: Array<number> = [];
    for (const index of indices) {
      if (kept.length === 0) {
        kept.push(index);
        continue;
      }
      const previous = coordinate(ticks.values[kept[kept.length - 1]]);
      const current = coordinate(ticks.values[index]);
      if (!Number.isFinite(previous) || !Number.isFinite(current) || Math.abs(current - previous) >= density.minGap) {
        kept.push(index);
      }
    }
    if (preserveEnds && kept[kept.length - 1] !== indices[indices.length - 1]) kept.push(indices[indices.length - 1]);
    indices = kept;
  }
  if (density.maxCount !== undefined) {
    indices = pickSampleIndices(indices, density.maxCount, preserveEnds);
  }
  return {
    values: indices.map(index => ticks.values[index]),
    labels: indices.map(index => ticks.labels[index]),
  };
};
