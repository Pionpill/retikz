import { inferCategoryDomain, resolveScale } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import { scaleQuantile as d3ScaleQuantile } from 'd3-scale';

import { RetikzPlotError } from '../../../error';
import type {
  IRPlotDivergingColorScale,
  IRPlotOrdinalScale,
  IRPlotQuantileColorScale,
  IRPlotQuantizeColorScale,
  IRPlotSequentialColorScale,
  IRPlotThresholdColorScale,
} from '../../../schemas';
import { BuiltinPlotColorScheme, BuiltinPlotScale } from '../../../schemas';
import type { ColorScaleEvaluator, ColorSchemeResolver } from '../shared';
import {
  builtinColorSchemeInterpolator,
  DEFAULT_PLOT_COLORS,
  safeExtent,
  sampleSchemeColors,
  toHexColor,
} from '../shared';

/** Validate color ranges at the consuming boundary */
const colorRange = (range: ReadonlyArray<string | number> | undefined): Array<string> | undefined =>
  range?.map(value => {
    if (typeof value !== 'string') throw new RetikzPlotError('color scale requires string outputs');
    return value;
  });

/** sequential 缺省配色（感知均匀、色盲友好） */
const DEFAULT_SEQUENTIAL_SCHEME = BuiltinPlotColorScheme.Viridis;

/** diverging 缺省配色（两侧红蓝、中点淡） */
const DEFAULT_DIVERGING_SCHEME = BuiltinPlotColorScheme.RdBu;

/** 默认离散化档数（choropleth 社区惯例 4–7 档） */
const DEFAULT_DISCRETE_BIN_COUNT = 5;

// ── 分类 → 离散输出（ordinal）─────────────────────────────────────────────────────

/**
 * 建序数 scale（d3 scaleOrdinal）：分类域 → 离散输出（颜色）
 * @description range 省略用默认配色方案（schemeCategory10，10 色，域超出循环复用）；domain 省略按数据序去重推断。
 *   返回 (category) => 输出串；非位置通道（color）消费
 */
export const resolveOrdinalScale = (
  def: IRPlotOrdinalScale | undefined,
  values: Array<unknown>,
): ((value: string | number) => string) => {
  const domain = def?.domain ?? inferCategoryDomain(values);
  const range = colorRange(def?.range) ?? DEFAULT_PLOT_COLORS;
  const step = def?.rangeIndex?.step ?? 1;
  const offset = def?.rangeIndex?.offset ?? 0;
  const indexedRange = range.map((_color, index) => range[(index * step + offset) % range.length]);
  const mapping = resolveScale(
    { type: 'ordinal', domain, range: indexedRange, params: { unknown: 'extend' } },
    { values: [] },
  );

  return value => mapping.map(value) as string;
};

// ── 连续 → 颜色（sequential / diverging）+ 离散化分箱（quantize / threshold / quantile）──

/** 离散化档色：range 显式给则直用、否则从 scheme 采 binCount 档（range 长度即档数） */
const discreteBinColors = (
  range: ReadonlyArray<string> | undefined,
  scheme: string | undefined,
  binCount: number,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): Array<string> => (range ? [...range] : sampleSchemeColors(scheme, binCount, resolveScheme));

/**
 * sequential 颜色 scale 求值：单调量 domain [min, max] → 单方向色带
 * @description domain 缺省从数据 [min, max] 推断；显式 domain 须 min < max（违反 fail-loud）。
 *   range 给定（两端颜色）→ 经 scaleLinear 颜色插值覆盖 scheme；否则用命名 scheme interpolator（缺省 viridis）。
 *   单值数据（min == max 推断）退化为常量取色（端点），不崩
 */
export const resolveSequentialColorScale = (
  def: IRPlotSequentialColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  if (def.domain && !(isFiniteNumber(def.domain[0]) && isFiniteNumber(def.domain[1]))) {
    throw new RetikzPlotError(
      `lowerPlots: sequential color scale "${def.name}" domain endpoints must be finite numbers (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }

  if (def.domain && def.domain[0] >= def.domain[1]) {
    throw new RetikzPlotError(
      `lowerPlots: sequential color scale "${def.name}" domain must satisfy min < max (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }

  const scheme = def.scheme ?? DEFAULT_SEQUENTIAL_SCHEME;
  const mapping = resolveScale(
    { type: 'sequential', domain: def.domain, range: def.range, params: { scheme } },
    { values, interpolators: def.range === undefined ? new Map([[scheme, resolveScheme(scheme)]]) : undefined },
  );
  return value => toHexColor(mapping.map(value) as string);
};

/**
 * diverging 颜色 scale 求值：有中点的量 domain [low, mid, high] → 两侧异色色带（中点淡）
 * @description domain 缺省从数据 [min, (min+max)/2, max] 推断；显式 domain 须 low < mid < high（违反 fail-loud）。
 *   range 给定（三端点）→ 经三段 scaleLinear 颜色插值覆盖 scheme；否则用命名 diverging scheme（缺省 rdbu），
 *   把 [low, mid, high] 映射到 interpolator 的 [0, 0.5, 1]
 */
export const resolveDivergingColorScale = (
  def: IRPlotDivergingColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  let low: number;
  let mid: number;
  let high: number;
  if (def.domain) {
    [low, mid, high] = def.domain;
    if (!(isFiniteNumber(low) && isFiniteNumber(mid) && isFiniteNumber(high))) {
      throw new RetikzPlotError(
        `lowerPlots: diverging color scale "${def.name}" domain endpoints must be finite numbers (got [${low}, ${mid}, ${high}])`,
      );
    }

    if (!(low < mid && mid < high)) {
      throw new RetikzPlotError(
        `lowerPlots: diverging color scale "${def.name}" domain must satisfy low < mid < high (got [${low}, ${mid}, ${high}])`,
      );
    }
  }

  const scheme = def.scheme ?? DEFAULT_DIVERGING_SCHEME;
  const mapping = resolveScale(
    { type: 'diverging', domain: def.domain, range: def.range, params: { scheme } },
    { values, interpolators: def.range === undefined ? new Map([[scheme, resolveScheme(scheme)]]) : undefined },
  );
  return value => toHexColor(mapping.map(value) as string);
};

/**
 * quantize 颜色 scale 求值：连续 domain [min, max] 等宽切 count 段 → 离散色档（d3 scaleQuantize）
 * @description domain 缺省从数据 [min, max] 推断；count 缺省 5（range 给定时档数 = range.length，覆盖 count）。
 *   range 显式给颜色数组、否则从 scheme 采 count 档。超出 domain 的值落首 / 末档（d3 clamp 语义）
 */
export const resolveQuantizeColorScale = (
  def: IRPlotQuantizeColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  if (def.range && def.count !== undefined && def.range.length !== def.count) {
    throw new RetikzPlotError(
      `lowerPlots: quantize color scale "${def.name}" range length (${def.range.length}) must equal count (${def.count}) when both are given`,
    );
  }

  const binCount = def.range ? def.range.length : (def.count ?? DEFAULT_DISCRETE_BIN_COUNT);
  const colors = discreteBinColors(colorRange(def.range), def.scheme, binCount, resolveScheme);
  const [lo, hi] = def.domain ?? safeExtent(values);
  const mapping = resolveScale({ type: 'quantize', domain: [lo, hi], range: colors }, { values });

  return value => mapping.map(value) as string;
};

/**
 * threshold 颜色 scale 求值：用户自定义升序断点切档 → 离散色档（d3 scaleThreshold）
 * @description breakpoints 须严格升序（违反 fail-loud）；档数 = breakpoints.length + 1。
 *   range 显式给时长度须 = breakpoints.length + 1（违反 fail-loud）、否则从 scheme 采 breakpoints.length + 1 档。
 *   < 首断点落第 0 档、≥ 末断点落末档（d3 默认语义）
 */
export const resolveThresholdColorScale = (
  def: IRPlotThresholdColorScale,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  for (let index = 1; index < def.breakpoints.length; index++) {
    if (!(def.breakpoints[index - 1] < def.breakpoints[index])) {
      throw new RetikzPlotError(
        `lowerPlots: threshold color scale "${def.name}" breakpoints must be strictly ascending (got [${def.breakpoints.join(', ')}])`,
      );
    }
  }

  const binCount = def.breakpoints.length + 1;
  if (def.range && def.range.length !== binCount) {
    throw new RetikzPlotError(
      `lowerPlots: threshold color scale "${def.name}" range length (${def.range.length}) must equal breakpoints.length + 1 (${binCount})`,
    );
  }

  const colors = discreteBinColors(colorRange(def.range), def.scheme, binCount, resolveScheme);
  const mapping = resolveScale(
    { type: 'threshold', range: colors, params: { breakpoints: [...def.breakpoints] } },
    { values: [] },
  );

  return value => mapping.map(value) as string;
};

/**
 * quantile 颜色 scale 求值：按绑定数据分位切 count 档（每档样本数约等）→ 离散色档（d3 scaleQuantile）
 * @description count 缺省 5（range 给定时档数 = range.length，覆盖 count）；分位边界纯由数据定（schema 已 strip 显式 domain，此处不读）。
 *   range 显式给颜色数组、否则从 scheme 采 count 档
 */
export const resolveQuantileColorScale = (
  def: IRPlotQuantileColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  if (def.range && def.count !== undefined && def.range.length !== def.count) {
    throw new RetikzPlotError(
      `lowerPlots: quantile color scale "${def.name}" range length (${def.range.length}) must equal count (${def.count}) when both are given`,
    );
  }

  const binCount = def.range ? def.range.length : (def.count ?? DEFAULT_DISCRETE_BIN_COUNT);
  const colors = discreteBinColors(colorRange(def.range), def.scheme, binCount, resolveScheme);
  const scale = d3ScaleQuantile<string>()
    .domain([...values])
    .range(colors);

  return value => scale(value);
};

/** p 分位（线性插值法）：sortedAscending 已升序，p∈[0,1]（legend 分箱边界用） */
const quantileAt = (sortedAscending: ReadonlyArray<number>, p: number): number => {
  if (sortedAscending.length === 0) return 0;
  if (sortedAscending.length === 1) return sortedAscending[0];

  const position = p * (sortedAscending.length - 1);
  const lowerIndex = Math.floor(position);
  const fraction = position - lowerIndex;
  const lower = sortedAscending[lowerIndex];
  const upper = sortedAscending[Math.min(lowerIndex + 1, sortedAscending.length - 1)];

  return lower + (upper - lower) * fraction;
};

/**
 * 离散化色阶 → 档色 + 内部边界（legend 分箱 + channel 解析共用单一来源）
 * @description quantize：domain 等宽切；threshold：用户断点；quantile：数据分位。
 *   edges 是档间内部边界（长度 = binCount - 1）；colors 是各档色（range 显式则用、否则从 scheme 采）
 */
export const discretizedBins = (
  def: IRPlotQuantizeColorScale | IRPlotThresholdColorScale | IRPlotQuantileColorScale,
  values: ReadonlyArray<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): { colors: Array<string>; edges: Array<number> } => {
  if (def.type === BuiltinPlotScale.Threshold) {
    const edges = [...def.breakpoints];
    const binCount = edges.length + 1;
    const colors = def.range ? colorRange(def.range)! : sampleSchemeColors(def.scheme, binCount, resolveScheme);

    return { colors, edges };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const binCount = def.range ? def.range.length : (def.count ?? DEFAULT_DISCRETE_BIN_COUNT);
  if (def.type === BuiltinPlotScale.Quantile) {
    const edges = Array.from({ length: Math.max(0, binCount - 1) }, (_unused, index) =>
      quantileAt(sorted, (index + 1) / binCount),
    );
    const colors = def.range ? colorRange(def.range)! : sampleSchemeColors(def.scheme, binCount, resolveScheme);

    return { colors, edges };
  }

  // quantize：domain 等宽切
  const lo = def.domain ? def.domain[0] : sorted.length > 0 ? sorted[0] : 0;
  const hi = def.domain ? def.domain[1] : sorted.length > 0 ? sorted[sorted.length - 1] : 1;
  const edges = Array.from(
    { length: Math.max(0, binCount - 1) },
    (_unused, index) => lo + ((index + 1) * (hi - lo)) / binCount,
  );
  const colors = def.range ? colorRange(def.range)! : sampleSchemeColors(def.scheme, binCount, resolveScheme);

  return { colors, edges };
};

// ── channel 族 scale definition ───────────────────────────────────────────────────
