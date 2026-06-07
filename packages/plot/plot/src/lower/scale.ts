import { extent } from 'd3-array';
import {
  type ScaleBand,
  type ScaleLinear,
  type ScalePoint,
  type ScaleTime,
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  scalePoint,
  scaleUtc,
} from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { type BandScale, type OrdinalScale, PlotScale, type PointScale, type ScalarValue, type Scale, type TimeScale } from '../ir';
import { isFiniteNumber } from './field';
import { isIsoDateString } from './infer';

/** 默认目标刻度数（d3 ticks 的提示值，非硬约束——实际数量按 nice 区间取整定） */
export const DEFAULT_TICK_COUNT = 5;

/** band scale 默认柱间缝（占 step 比例）；柱状图普遍带窄缝，比 d3 原始默认 0 友好 */
const DEFAULT_BAND_PADDING_INNER = 0.1;

/** point scale 默认外缝（占 step 比例）；对齐 d3 scalePoint 默认，首尾各留半步 */
const DEFAULT_POINT_PADDING = 0.5;

/** 一组刻度：值（连续=number / 分类=类别）+ 对应格式化标签 */
export type TickSet = { values: Array<ScalarValue>; labels: Array<string> };

/**
 * 归一化位置 scale：连续 / band / point 对 projector & guide 暴露同一形态
 * @description 把「band 起点 vs 中心」「bandwidth 是否为 0」「类别 vs 数值刻度」收进一层；
 *   下游（projector / guide / bar）只认 coordinate + bandwidth + ticks，不各自分支 scale 类型。
 *   连续走 bandwidth=0 + coordinate=scale(value)，逐字守住 alpha.1/alpha.2 投影与刻度。
 */
export type PositionScale = {
  /** 数据值 → 坐标（连续=scale(value)；band=band 中心；point=点位）；非法值返回 NaN，调用方据此跳过 */
  coordinate: (value: unknown) => number;
  /** band 宽（连续 / point = 0；band = scale.bandwidth()）；getter 反映 setRange 后的最新值 */
  readonly bandwidth: number;
  /** 刻度 + 标签（连续走 scaleTicks；band / point = 每类别一刻度，落 band 中心 / 点位） */
  ticks: (count?: number) => TickSet;
  /** 当前 range [start, end]（屏幕坐标，y 可能倒置） */
  range: () => [number, number];
  /** 设置 range（显式 range 的 scale 由 expand 决定是否调用） */
  setRange: (range: readonly [number, number]) => void;
};

/** 从一组数值求 [min, max]；空集 / 全非有限回退 [0, 1]（d3 extent 对空集返回 [undefined, undefined]） */
const safeExtent = (values: Array<number>): [number, number] => {
  // d3 extent 空集返回 [undefined, undefined]（相关元组：lo 为 undefined 则 hi 必然也是）
  const [lo, hi] = extent(values);
  return lo === undefined ? [0, 1] : [lo, hi];
};

/**
 * 建轴的线性 scale（d3 scaleLinear）
 * @description domain 缺省时从绑定数据值推断（d3 extent）；range 缺省时用 fallback（坐标系尺寸给）。
 *   返回 d3 ScaleLinear：可作 `(value) => number` 投影，也可 `.ticks()` / `.tickFormat()` / `.range([...])` 后续设值。
 *   单值 domain（d0=d1）d3 归一化返回 0.5 → 映射到 range 中点，与早期自写 linear 行为一致。
 */
export const resolveLinearScale = (
  def: { domain?: readonly [number, number]; range?: readonly [number, number]; nice?: boolean; clamp?: boolean },
  values: Array<number>,
  fallbackRange: readonly [number, number],
): ScaleLinear<number, number> => {
  const scale = scaleLinear()
    .domain([...(def.domain ?? safeExtent(values))])
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 取一个线性 scale 的刻度值 + 格式化标签
 * @description 刻度值 / 标签只依赖 domain + count（与 range 无关）——故可在 range 定下来前先算，供布局估算 margin（ADR-03）。
 *   axis 与同维 grid 复用同一 TickSet（同源）。
 */
export const scaleTicks = (scale: ScaleLinear<number, number>, count: number = DEFAULT_TICK_COUNT): TickSet => {
  const values = scale.ticks(count);
  const format = scale.tickFormat(count);
  return { values, labels: values.map(format) };
};

/**
 * 分类域推断：按数据出现顺序去重（非排序、非 extent）
 * @description band / point / ordinal 共用——保证图上类别顺序 = 数据顺序；排序是 transform 的显式职责。
 */
export const inferCategoryDomain = (values: Array<unknown>): Array<string | number> => {
  const seen = new Set<string | number>();
  const out: Array<string | number> = [];
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
};

/** 建分类 band scale（d3 scaleBand）；domain 缺省按数据序去重推断 */
export const resolveBandScale = (
  def: BandScale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): ScaleBand<string | number> => {
  const scale = scaleBand<string | number>()
    .domain(def.domain ?? inferCategoryDomain(values))
    .range([fallbackRange[0], fallbackRange[1]]);
  scale.paddingInner(def.paddingInner ?? DEFAULT_BAND_PADDING_INNER);
  scale.paddingOuter(def.paddingOuter ?? def.paddingInner ?? DEFAULT_BAND_PADDING_INNER);
  if (def.align !== undefined) scale.align(def.align);
  return scale;
};

/** 建分类 point scale（d3 scalePoint）；domain 缺省按数据序去重推断 */
export const resolvePointScale = (
  def: PointScale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): ScalePoint<string | number> => {
  const scale = scalePoint<string | number>()
    .domain(def.domain ?? inferCategoryDomain(values))
    .range([fallbackRange[0], fallbackRange[1]]);
  scale.padding(def.padding ?? DEFAULT_POINT_PADDING);
  if (def.align !== undefined) scale.align(def.align);
  return scale;
};

/**
 * 建序数 scale（d3 scaleOrdinal）：分类域 → 离散输出（颜色）
 * @description range 省略用默认配色方案（schemeCategory10，10 色，域超出循环复用）；domain 省略按数据序去重推断。
 *   返回 (category) => 输出串；非位置通道（color）消费。
 */
export const resolveOrdinalScale = (
  def: OrdinalScale | undefined,
  values: Array<unknown>,
): ((value: string | number) => string) => {
  const domain = def?.domain ?? inferCategoryDomain(values);
  const range = def?.range ?? [...schemeCategory10];
  const scale = scaleOrdinal<string | number, string>().domain(domain).range(range);
  return value => scale(value);
};

/** 分类 scale 的刻度 = 每类别一刻度（值 = 类别、标签 = 类别串） */
const categoryTicks = (scale: ScaleBand<string | number> | ScalePoint<string | number>): TickSet => {
  const domain = scale.domain();
  return { values: [...domain], labels: domain.map(String) };
};

/** 连续 scale → PositionScale（bandwidth=0；只接受有限数值，守 alpha.1 跳过语义） */
export const linearPositionScale = (scale: ScaleLinear<number, number>): PositionScale => ({
  coordinate: value => (isFiniteNumber(value) ? scale(value) : NaN),
  get bandwidth() {
    return 0;
  },
  ticks: count => scaleTicks(scale, count),
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

/** band scale → PositionScale（coordinate 取 band 中心；bandwidth = scale.bandwidth() 实时） */
export const bandPositionScale = (scale: ScaleBand<string | number>): PositionScale => ({
  coordinate: value => {
    if (typeof value !== 'string' && typeof value !== 'number') return NaN;
    const start = scale(value);
    return start === undefined ? NaN : start + scale.bandwidth() / 2;
  },
  get bandwidth() {
    return scale.bandwidth();
  },
  ticks: () => categoryTicks(scale),
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

/** point scale → PositionScale（coordinate 取点位；bandwidth=0） */
export const pointPositionScale = (scale: ScalePoint<string | number>): PositionScale => ({
  coordinate: value => {
    if (typeof value !== 'string' && typeof value !== 'number') return NaN;
    const position = scale(value);
    return position === undefined ? NaN : position;
  },
  get bandwidth() {
    return 0;
  },
  ticks: () => categoryTicks(scale),
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

/** 字段值 → epoch ms（Date 实例 / 数值原样 / 严格 ISO 字符串走 Date.parse；其余 → null） */
export const toTimestamp = (value: unknown): number | null => {
  if (value instanceof Date) {
    const stamp = value.getTime();
    return Number.isNaN(stamp) ? null : stamp;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    // 严格 ISO guard（与 ADR-01 推断同一套）：拒 YYYY/MM/DD、无时区 datetime、裸数字串，避免误解析
    if (!isIsoDateString(value)) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

/** 时间 scale 的刻度：值用 epoch ms（供 coordinate 再投影）、标签走 UTC tickFormat */
export const timeTicks = (scale: ScaleTime<number, number>, count: number = DEFAULT_TICK_COUNT): TickSet => {
  const ticks = scale.ticks(count);
  const format = scale.tickFormat(count);
  return { values: ticks.map(date => date.getTime()), labels: ticks.map(format) };
};

/** 建时间 scale（d3 scaleUtc，UTC 语义、环境无关）；domain 缺省从字段时间戳 extent 推断 */
export const resolveTimeScale = (
  def: TimeScale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): ScaleTime<number, number> => {
  const stamps = values.map(toTimestamp).filter((stamp): stamp is number => stamp !== null);
  const [lo, hi] = def.domain ?? safeExtent(stamps);
  const scale = scaleUtc()
    .domain([new Date(lo), new Date(hi)])
    .range([fallbackRange[0], fallbackRange[1]]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/** time scale → PositionScale（连续语义，bandwidth=0；coordinate 解析时间戳后投影） */
export const timePositionScale = (scale: ScaleTime<number, number>): PositionScale => ({
  coordinate: value => {
    const stamp = toTimestamp(value);
    return stamp === null ? NaN : scale(new Date(stamp));
  },
  get bandwidth() {
    return 0;
  },
  ticks: count => timeTicks(scale, count),
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

/**
 * 按 scale 定义建对应 PositionScale
 * @description linear / time → 连续；band / point → 分类（按数据序去重推断 domain）。ordinal 不可作位置通道。
 */
export const resolvePositionScale = (
  def: Scale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): PositionScale => {
  switch (def.type) {
    case PlotScale.Band:
      return bandPositionScale(resolveBandScale(def, values, fallbackRange));
    case PlotScale.Point:
      return pointPositionScale(resolvePointScale(def, values, fallbackRange));
    case PlotScale.Linear:
      return linearPositionScale(resolveLinearScale(def, values.filter(isFiniteNumber), fallbackRange));
    case PlotScale.Time:
      return timePositionScale(resolveTimeScale(def, values, fallbackRange));
    case PlotScale.Ordinal:
      throw new Error(`resolvePositionScale: ordinal scale "${def.name}" cannot drive a positional (x/y) channel`);
  }
};
