import type {
  ScaleBand as D3ScaleBand,
  ScaleContinuousNumeric as D3ScaleContinuousNumeric,
  ScaleLinear as D3ScaleLinear,
  ScalePoint as D3ScalePoint,
  ScaleTime as D3ScaleTime,
} from 'd3-scale';

import { coerceTimestamp, inferCategoryDomain } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import { extent as d3Extent } from 'd3-array';
import {
  scaleBand as d3ScaleBand,
  scaleLinear as d3ScaleLinear,
  scaleLog as d3ScaleLog,
  scalePoint as d3ScalePoint,
  scalePow as d3ScalePow,
  scaleRadial as d3ScaleRadial,
  scaleSymlog as d3ScaleSymlog,
  scaleUtc as d3ScaleUtc,
} from 'd3-scale';

import type { AnyScaleDefinition, PositionScale, TickSet } from '../../../contract';
import type {
  IRPlotBandScale,
  IRPlotLinearScale,
  IRPlotLogScale,
  IRPlotPointScale,
  IRPlotPowScale,
  IRPlotRadialScale,
  IRPlotSqrtScale,
  IRPlotSymlogScale,
  IRPlotTimeScale,
} from '../../../schemas';

import { defineScale } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import {
  BandScaleSchema,
  LinearScaleSchema,
  LogScaleSchema,
  PointScaleSchema,
  PowScaleSchema,
  RadialScaleSchema,
  SqrtScaleSchema,
  SymlogScaleSchema,
  TimeScaleSchema,
} from '../../../schemas';
import { DEFAULT_TICK_COUNT, safeExtent, scaleTicks } from '../shared';

// ── 连续数值位置 scale（linear / log / pow / sqrt / symlog / radial）────────────────

/**
 * 建轴的线性 scale（d3 scaleLinear）
 * @description domain 缺省时从绑定数据值推断（d3 extent）；range 缺省时用 fallback（坐标系尺寸给）。
 *   返回 d3 ScaleLinear：可作 `(value) => number` 投影，也可 `.ticks()` / `.tickFormat()` / `.range([...])` 后续设值。
 *   单值 domain（d0=d1）d3 归一化返回 0.5 → 映射到 range 中点，与早期自写 linear 行为一致
 */
/** 解析线性位置比例尺的 domain、range 与映射函数 */
export const resolveLinearScale = (
  def: IRPlotLinearScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): D3ScaleLinear<number, number> => {
  const domain = [...(def.domain ?? safeExtent(values))];
  const scale = d3ScaleLinear()
    .domain(domain)
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建对数 scale（d3 scaleLog，全正 domain）
 * @description 显式 domain 含 0 / 负值 → fail-loud；缺省从正值 extent 推断（空集回退 [1, 10]）。
 *   非正数据值不在此拦截——由 continuousPositionScale 的 isValidInput 跳过（NaN），与连续 scale 跳过非有限值同理
 */
/** 解析对数位置比例尺的 domain、range 与映射函数 */
export const resolveLogScale = (
  def: IRPlotLogScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): D3ScaleContinuousNumeric<number, number> => {
  if (def.domain && (def.domain[0] <= 0 || def.domain[1] <= 0)) {
    throw new RetikzPlotError(
      `lowerPlots: log scale "${def.name}" domain must be strictly positive (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }
  const positives = values.filter(value => value > 0);
  const [lo, hi] = d3Extent(positives);
  const sourceDomain = def.domain ?? (lo === undefined ? [1, 10] : [lo, hi]);
  const domain = [...sourceDomain];
  const scale = d3ScaleLog()
    .base(def.base ?? 10)
    .domain(domain)
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建幂 scale（d3 scalePow）
 * @description 非整数 exponent + 显式 domain 含负值 → fail-loud（避免 d3 sign-preserving 反直觉）；
 *   整数 exponent 允许负 domain。exponent 缺省 2
 */
export const resolvePowScale = (
  def: IRPlotPowScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): D3ScaleContinuousNumeric<number, number> => {
  const exponent = def.exponent ?? 2;
  if (def.domain && !Number.isInteger(exponent) && (def.domain[0] < 0 || def.domain[1] < 0)) {
    throw new RetikzPlotError(
      `lowerPlots: pow scale "${def.name}" with non-integer exponent ${exponent} requires a non-negative domain (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }
  const sourceDomain = def.domain ?? safeExtent(values);
  const domain = [...sourceDomain];
  const scale = d3ScalePow()
    .exponent(exponent)
    .domain(domain)
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建平方根 scale（d3 scalePow exponent 0.5；面积感知）
 * @description 显式 domain 含负值 → fail-loud；缺省从非负值 extent 推断。负数据值由 isValidInput 跳过
 */
export const resolveSqrtScale = (
  def: IRPlotSqrtScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): D3ScaleContinuousNumeric<number, number> => {
  if (def.domain && (def.domain[0] < 0 || def.domain[1] < 0)) {
    throw new RetikzPlotError(
      `lowerPlots: sqrt scale "${def.name}" domain must be non-negative (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }
  const sourceDomain = def.domain ?? safeExtent(values.filter(value => value >= 0));
  const domain = [...sourceDomain];
  const scale = d3ScalePow()
    .exponent(0.5)
    .domain(domain)
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建对称对数 scale（d3 scaleSymlog）
 * @description 近零线性、尾部对数，能处理跨零 / 含负的宽幅数据（log 不能）。constant 控制近零线性区宽度（缺省 1）。
 *   domain 缺省从值 extent 推断；负 / 零 domain 合法（symlog 全域有定义），不 fail-loud
 */
export const resolveSymlogScale = (
  def: IRPlotSymlogScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): D3ScaleContinuousNumeric<number, number> => {
  const sourceDomain = def.domain ?? safeExtent(values);
  const domain = [...sourceDomain];
  const scale = d3ScaleSymlog<number, number>()
    .domain(domain)
    .range([...(def.range ?? fallbackRange)]);
  if (def.constant !== undefined) scale.constant(def.constant);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建径向 scale（d3 scaleRadial；面积感知半径）
 * @description 输出半径使「编码面积」正比于值（开方映射）；极坐标 / 玫瑰图（南丁格尔）的天然值 scale。
 *   domain 缺省从值 extent 推断
 */
export const resolveRadialScale = (
  def: IRPlotRadialScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): D3ScaleContinuousNumeric<number, number> => {
  const sourceDomain = def.domain ?? safeExtent(values.filter(value => value >= 0));
  const domain = [...sourceDomain];
  const scale = d3ScaleRadial<number>()
    .domain(domain)
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/** 连续 scale → PositionScale（bandwidth=0；只接受有限数值，非法值返回 NaN 供下游跳过） */
export const linearPositionScale = (scale: D3ScaleLinear<number, number>): PositionScale => ({
  coordinate: value => (isFiniteNumber(value) ? scale(value) : NaN),
  domain: () => {
    const [start, end] = scale.domain();
    return [start, end];
  },
  get bandwidth() {
    return 0;
  },
  ticks: count => scaleTicks(scale, count),
  tickKind: 'number',
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

/**
 * 连续数值 scale → PositionScale（linear / log / pow / sqrt / symlog / radial 共用）
 * @description bandwidth=0；isValidInput 拦不可绘的值（log ≤ 0、sqrt / 非整数幂 < 0）→ NaN 跳过；
 *   投影结果非有限（log(0)=-∞）也归 NaN，与连续 scale 跳过非有限值一致
 */
export const continuousPositionScale = (
  scale: D3ScaleContinuousNumeric<number, number>,
  isValidInput: (value: unknown) => boolean = isFiniteNumber,
): PositionScale => ({
  coordinate: value => {
    if (!isValidInput(value)) return NaN;
    const coordinate = scale(value as number);
    return Number.isFinite(coordinate) ? coordinate : NaN;
  },
  domain: () => {
    const [start, end] = scale.domain();
    return [start, end];
  },
  get bandwidth() {
    return 0;
  },
  ticks: count => scaleTicks(scale, count),
  tickKind: 'number',
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

// ── 时间位置 scale（time）────────────────────────────────────────────────────────

/** 时间 scale 的刻度：值用 epoch ms（供 coordinate 再投影）、标签走 UTC tickFormat */
export const timeTicks = (scale: D3ScaleTime<number, number>, count: number = DEFAULT_TICK_COUNT): TickSet => {
  const ticks = scale.ticks(count);
  const format = scale.tickFormat(count);
  return { values: ticks.map(date => date.getTime()), labels: ticks.map(format) };
};

/** 建时间 scale（d3 scaleUtc，UTC 语义、环境无关）；domain 缺省从字段时间戳 extent 推断 */
export const resolveTimeScale = (
  def: IRPlotTimeScale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): D3ScaleTime<number, number> => {
  const stamps = values.map(coerceTimestamp).filter((stamp): stamp is number => stamp !== null);
  const [lo, hi] = def.domain ?? safeExtent(stamps);
  const scale = d3ScaleUtc()
    .domain([new Date(lo), new Date(hi)])
    .range([fallbackRange[0], fallbackRange[1]]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/** time scale → PositionScale（连续语义，bandwidth=0；coordinate 解析时间戳后投影） */
export const timePositionScale = (scale: D3ScaleTime<number, number>): PositionScale => ({
  coordinate: value => {
    const stamp = coerceTimestamp(value);
    return stamp === null ? NaN : scale(new Date(stamp));
  },
  domain: () => {
    const [start, end] = scale.domain();
    return [start.getTime(), end.getTime()];
  },
  get bandwidth() {
    return 0;
  },
  ticks: count => timeTicks(scale, count),
  tickKind: 'time',
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

// ── 分类位置 scale（band / point）─────────────────────────────────────────────────

/** band scale 默认柱间缝（占 step 比例）；柱状图普遍带窄缝，比 d3 原始默认 0 友好 */
const DEFAULT_BAND_PADDING_INNER = 0.1;

/** point scale 默认外缝（占 step 比例）；对齐 d3 scalePoint 默认，首尾各留半步 */
const DEFAULT_POINT_PADDING = 0.5;

/** 建分类 band scale（d3 scaleBand）；domain 缺省按数据序去重推断 */
export const resolveBandScale = (
  def: IRPlotBandScale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): D3ScaleBand<string | number> => {
  const scale = d3ScaleBand<string | number>()
    .domain(def.domain ?? inferCategoryDomain(values))
    .range([fallbackRange[0], fallbackRange[1]]);
  scale.paddingInner(def.paddingInner ?? DEFAULT_BAND_PADDING_INNER);
  scale.paddingOuter(def.paddingOuter ?? def.paddingInner ?? DEFAULT_BAND_PADDING_INNER);
  if (def.align !== undefined) scale.align(def.align);
  return scale;
};

/** 建分类 point scale（d3 scalePoint）；domain 缺省按数据序去重推断 */
export const resolvePointScale = (
  def: IRPlotPointScale,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): D3ScalePoint<string | number> => {
  const scale = d3ScalePoint<string | number>()
    .domain(def.domain ?? inferCategoryDomain(values))
    .range([fallbackRange[0], fallbackRange[1]]);
  scale.padding(def.padding ?? DEFAULT_POINT_PADDING);
  if (def.align !== undefined) scale.align(def.align);
  return scale;
};

/** 分类 scale 的刻度 = 每类别一刻度（值 = 类别、标签 = 类别串） */
const categoryTicks = (scale: D3ScaleBand<string | number> | D3ScalePoint<string | number>): TickSet => {
  const domain = scale.domain();
  return { values: [...domain], labels: domain.map(String) };
};

/** band scale → PositionScale（coordinate 取 band 中心；bandwidth = scale.bandwidth() 实时） */
export const bandPositionScale = (scale: D3ScaleBand<string | number>): PositionScale => ({
  coordinate: value => {
    if (typeof value !== 'string' && typeof value !== 'number') return NaN;
    const start = scale(value);
    return start === undefined ? NaN : start + scale.bandwidth() / 2;
  },
  domain: () => [...scale.domain()],
  get bandwidth() {
    return scale.bandwidth();
  },
  ticks: () => categoryTicks(scale),
  tickKind: 'category',
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

/** point scale → PositionScale（coordinate 取点位；bandwidth=0） */
export const pointPositionScale = (scale: D3ScalePoint<string | number>): PositionScale => ({
  coordinate: value => {
    if (typeof value !== 'string' && typeof value !== 'number') return NaN;
    const position = scale(value);
    return position === undefined ? NaN : position;
  },
  domain: () => [...scale.domain()],
  get bandwidth() {
    return 0;
  },
  ticks: () => categoryTicks(scale),
  tickKind: 'category',
  range: () => {
    const [start, end] = scale.range();
    return [start, end];
  },
  setRange: range => {
    scale.range([range[0], range[1]]);
  },
});

// ── position 族 scale definition ──────────────────────────────────────────────────

const linearScaleDefinition = defineScale<IRPlotLinearScale>({
  family: 'position',
  schema: LinearScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  allowsBaseline: true,
  resolve: (def, values, range) => linearPositionScale(resolveLinearScale(def, values.filter(isFiniteNumber), range)),
});

const logScaleDefinition = defineScale<IRPlotLogScale>({
  family: 'position',
  schema: LogScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  allowsBaseline: false,
  resolve: (def, values, range) =>
    continuousPositionScale(
      resolveLogScale(def, values.filter(isFiniteNumber), range),
      value => isFiniteNumber(value) && value > 0,
    ),
});

const powScaleDefinition = defineScale<IRPlotPowScale>({
  family: 'position',
  schema: PowScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  allowsBaseline: false,
  resolve: (def, values, range) => {
    const integerExponent = Number.isInteger(def.exponent ?? 2);
    const isValidInput = integerExponent
      ? isFiniteNumber
      : (value: unknown): boolean => isFiniteNumber(value) && value >= 0;
    return continuousPositionScale(resolvePowScale(def, values.filter(isFiniteNumber), range), isValidInput);
  },
});

const sqrtScaleDefinition = defineScale<IRPlotSqrtScale>({
  family: 'position',
  schema: SqrtScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  allowsBaseline: false,
  resolve: (def, values, range) =>
    continuousPositionScale(
      resolveSqrtScale(def, values.filter(isFiniteNumber), range),
      value => isFiniteNumber(value) && value >= 0,
    ),
});

const symlogScaleDefinition = defineScale<IRPlotSymlogScale>({
  family: 'position',
  schema: SymlogScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  // 与 log/pow/sqrt 同属非线性连续 scale → 不作 interval / area 值轴（柱 / 面积长度会失真）
  allowsBaseline: false,
  // symlog 全域有定义（含零 / 负），输入仅需有限数，沿用默认 isFiniteNumber 守门
  resolve: (def, values, range) =>
    continuousPositionScale(resolveSymlogScale(def, values.filter(isFiniteNumber), range)),
});

const radialScaleDefinition = defineScale<IRPlotRadialScale>({
  family: 'position',
  schema: RadialScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  // 面积感知半径，自 0 基线起算（南丁格尔 / 玫瑰图扇区面积编码值）→ 允许作 interval / path closure 值轴
  allowsBaseline: true,
  resolve: (def, values, range) =>
    continuousPositionScale(resolveRadialScale(def, values.filter(isFiniteNumber), range)),
});

const timeScaleDefinition = defineScale<IRPlotTimeScale>({
  family: 'position',
  schema: TimeScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  allowsBaseline: true,
  resolve: (def, values, range) => timePositionScale(resolveTimeScale(def, values, range)),
});

const bandScaleDefinition = defineScale<IRPlotBandScale>({
  family: 'position',
  schema: BandScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Temporal,
  allowsBaseline: true,
  resolve: (def, values, range) => bandPositionScale(resolveBandScale(def, values, range)),
});

const pointScaleDefinition = defineScale<IRPlotPointScale>({
  family: 'position',
  schema: PointScaleSchema,
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Temporal,
  allowsBaseline: true,
  resolve: (def, values, range) => pointPositionScale(resolvePointScale(def, values, range)),
});

/** position 族 scale definition（连续 6 + 时间 1 + 分类 2 = 9）：产坐标，喂 coordinate projector + guide */
export const POSITION_SCALE_DEFINITIONS: ReadonlyArray<AnyScaleDefinition> = [
  linearScaleDefinition,
  logScaleDefinition,
  powScaleDefinition,
  sqrtScaleDefinition,
  symlogScaleDefinition,
  radialScaleDefinition,
  timeScaleDefinition,
  bandScaleDefinition,
  pointScaleDefinition,
] as ReadonlyArray<AnyScaleDefinition>;
