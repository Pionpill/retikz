import { inferCategoryDomain } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import {
  scaleLinear as d3ScaleLinear,
  scaleOrdinal as d3ScaleOrdinal,
  scaleQuantile as d3ScaleQuantile,
  scaleQuantize as d3ScaleQuantize,
  scaleThreshold as d3ScaleThreshold,
} from 'd3-scale';

import type { AnyScaleDefinition, ChannelResolveContext, ChannelScaleResolution } from '../../../contract';
import type {
  DivergingColorScale,
  OrdinalScale,
  QuantileColorScale,
  QuantizeColorScale,
  SequentialColorScale,
  ThresholdColorScale,
} from '../../../schemas';
import type { ColorScaleEvaluator, ColorSchemeResolver } from '../shared';

import { defineScale } from '../../../contract';
import {
  DivergingColorScaleSchema,
  OrdinalScaleSchema,
  PlotScale,
  QuantileColorScaleSchema,
  QuantizeColorScaleSchema,
  SequentialColorScaleSchema,
  ThresholdColorScaleSchema,
} from '../../../schemas';
import {
  builtinColorSchemeInterpolator,
  DEFAULT_PLOT_COLORS,
  PlotColorScheme,
  safeExtent,
  sampleSchemeColors,
  toHexColor,
} from '../shared';

/** sequential 缺省配色（感知均匀、色盲友好） */
const DEFAULT_SEQUENTIAL_SCHEME = PlotColorScheme.Viridis;
/** diverging 缺省配色（两侧红蓝、中点淡） */
const DEFAULT_DIVERGING_SCHEME = PlotColorScheme.RdBu;
/** 默认离散化档数（choropleth 社区惯例 4–7 档） */
const DEFAULT_DISCRETE_BIN_COUNT = 5;

// ── 分类 → 离散输出（ordinal）─────────────────────────────────────────────────────

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
  const range = def?.range ?? DEFAULT_PLOT_COLORS;
  const scale = d3ScaleOrdinal<string | number, string>().domain(domain).range(range);
  return value => scale(value);
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
 *   单值数据（min == max 推断）退化为常量取色（端点），不崩。
 */
export const resolveSequentialColorScale = (
  def: SequentialColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  const [lo, hi] = def.domain ?? safeExtent(values);
  if (def.domain && !(isFiniteNumber(def.domain[0]) && isFiniteNumber(def.domain[1]))) {
    throw new Error(
      `lowerPlots: sequential color scale "${def.name}" domain endpoints must be finite numbers (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }
  if (def.domain && def.domain[0] >= def.domain[1]) {
    throw new Error(
      `lowerPlots: sequential color scale "${def.name}" domain must satisfy min < max (got [${def.domain[0]}, ${def.domain[1]}])`,
    );
  }
  if (def.range) {
    const scale = d3ScaleLinear<string, string>().domain([lo, hi]).range([def.range[0], def.range[1]]).clamp(true);
    return value => toHexColor(scale(value));
  }
  const interpolator = resolveScheme(def.scheme ?? DEFAULT_SEQUENTIAL_SCHEME);
  // 退化 domain（min == max）→ position 恒 0.5；正常 domain 线性归一化到 [0, 1] 再喂 interpolator
  const span = hi - lo;
  return value => {
    const t = span === 0 ? 0.5 : Math.max(0, Math.min(1, (value - lo) / span));
    return toHexColor(interpolator(t));
  };
};

/**
 * diverging 颜色 scale 求值：有中点的量 domain [low, mid, high] → 两侧异色色带（中点淡）
 * @description domain 缺省从数据 [min, (min+max)/2, max] 推断；显式 domain 须 low < mid < high（违反 fail-loud）。
 *   range 给定（三端点）→ 经三段 scaleLinear 颜色插值覆盖 scheme；否则用命名 diverging scheme（缺省 rdbu），
 *   把 [low, mid, high] 映射到 interpolator 的 [0, 0.5, 1]。
 */
export const resolveDivergingColorScale = (
  def: DivergingColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  let low: number;
  let mid: number;
  let high: number;
  if (def.domain) {
    [low, mid, high] = def.domain;
    if (!(isFiniteNumber(low) && isFiniteNumber(mid) && isFiniteNumber(high))) {
      throw new Error(
        `lowerPlots: diverging color scale "${def.name}" domain endpoints must be finite numbers (got [${low}, ${mid}, ${high}])`,
      );
    }
    if (!(low < mid && mid < high)) {
      throw new Error(
        `lowerPlots: diverging color scale "${def.name}" domain must satisfy low < mid < high (got [${low}, ${mid}, ${high}])`,
      );
    }
  } else {
    const [lo, hi] = safeExtent(values);
    low = lo;
    high = hi;
    mid = (lo + hi) / 2;
  }
  if (def.range) {
    const scale = d3ScaleLinear<string, string>()
      .domain([low, mid, high])
      .range([def.range[0], def.range[1], def.range[2]])
      .clamp(true);
    return value => toHexColor(scale(value));
  }
  const interpolator = resolveScheme(def.scheme ?? DEFAULT_DIVERGING_SCHEME);
  // [low, mid, high] → interpolator 的 [0, 0.5, 1]：两段线性，退化段（low==mid 等）由分支守住不除零
  return value => {
    let t: number;
    if (value <= low) t = 0;
    else if (value >= high) t = 1;
    else if (value <= mid) t = mid === low ? 0 : (0.5 * (value - low)) / (mid - low);
    else t = high === mid ? 1 : 0.5 + (0.5 * (value - mid)) / (high - mid);
    return toHexColor(interpolator(t));
  };
};

/**
 * quantize 颜色 scale 求值：连续 domain [min, max] 等宽切 count 段 → 离散色档（d3 scaleQuantize）
 * @description domain 缺省从数据 [min, max] 推断；count 缺省 5（range 给定时档数 = range.length，覆盖 count）。
 *   range 显式给颜色数组、否则从 scheme 采 count 档。超出 domain 的值落首 / 末档（d3 clamp 语义）。
 */
export const resolveQuantizeColorScale = (
  def: QuantizeColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  if (def.range && def.count !== undefined && def.range.length !== def.count) {
    throw new Error(
      `lowerPlots: quantize color scale "${def.name}" range length (${def.range.length}) must equal count (${def.count}) when both are given`,
    );
  }
  const binCount = def.range ? def.range.length : (def.count ?? DEFAULT_DISCRETE_BIN_COUNT);
  const colors = discreteBinColors(def.range, def.scheme, binCount, resolveScheme);
  const [lo, hi] = def.domain ?? safeExtent(values);
  const scale = d3ScaleQuantize<string>().domain([lo, hi]).range(colors);
  return value => scale(value);
};

/**
 * threshold 颜色 scale 求值：用户自定义升序断点切档 → 离散色档（d3 scaleThreshold）
 * @description breakpoints 须严格升序（违反 fail-loud）；档数 = breakpoints.length + 1。
 *   range 显式给时长度须 = breakpoints.length + 1（违反 fail-loud）、否则从 scheme 采 breakpoints.length + 1 档。
 *   < 首断点落第 0 档、≥ 末断点落末档（d3 默认语义）。
 */
export const resolveThresholdColorScale = (
  def: ThresholdColorScale,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  for (let index = 1; index < def.breakpoints.length; index++) {
    if (!(def.breakpoints[index - 1] < def.breakpoints[index])) {
      throw new Error(
        `lowerPlots: threshold color scale "${def.name}" breakpoints must be strictly ascending (got [${def.breakpoints.join(', ')}])`,
      );
    }
  }
  const binCount = def.breakpoints.length + 1;
  if (def.range && def.range.length !== binCount) {
    throw new Error(
      `lowerPlots: threshold color scale "${def.name}" range length (${def.range.length}) must equal breakpoints.length + 1 (${binCount})`,
    );
  }
  const colors = discreteBinColors(def.range, def.scheme, binCount, resolveScheme);
  const scale = d3ScaleThreshold<number, string>()
    .domain([...def.breakpoints])
    .range(colors);
  return value => scale(value);
};

/**
 * quantile 颜色 scale 求值：按绑定数据分位切 count 档（每档样本数约等）→ 离散色档（d3 scaleQuantile）
 * @description count 缺省 5（range 给定时档数 = range.length，覆盖 count）；分位边界纯由数据定（schema 已 strip 显式 domain，此处不读）。
 *   range 显式给颜色数组、否则从 scheme 采 count 档。
 */
export const resolveQuantileColorScale = (
  def: QuantileColorScale,
  values: Array<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): ColorScaleEvaluator => {
  if (def.range && def.count !== undefined && def.range.length !== def.count) {
    throw new Error(
      `lowerPlots: quantile color scale "${def.name}" range length (${def.range.length}) must equal count (${def.count}) when both are given`,
    );
  }
  const binCount = def.range ? def.range.length : (def.count ?? DEFAULT_DISCRETE_BIN_COUNT);
  const colors = discreteBinColors(def.range, def.scheme, binCount, resolveScheme);
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
 *   edges 是档间内部边界（长度 = binCount - 1）；colors 是各档色（range 显式则用、否则从 scheme 采）。
 */
export const discretizedBins = (
  def: QuantizeColorScale | ThresholdColorScale | QuantileColorScale,
  values: ReadonlyArray<number>,
  resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator,
): { colors: Array<string>; edges: Array<number> } => {
  if (def.type === PlotScale.Threshold) {
    const edges = [...def.breakpoints];
    const binCount = edges.length + 1;
    const colors = def.range ? [...def.range] : sampleSchemeColors(def.scheme, binCount, resolveScheme);
    return { colors, edges };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const binCount = def.range ? def.range.length : (def.count ?? DEFAULT_DISCRETE_BIN_COUNT);
  if (def.type === PlotScale.Quantile) {
    const edges = Array.from({ length: Math.max(0, binCount - 1) }, (_unused, index) =>
      quantileAt(sorted, (index + 1) / binCount),
    );
    const colors = def.range ? [...def.range] : sampleSchemeColors(def.scheme, binCount, resolveScheme);
    return { colors, edges };
  }
  // quantize：domain 等宽切
  const lo = def.domain ? def.domain[0] : sorted.length > 0 ? sorted[0] : 0;
  const hi = def.domain ? def.domain[1] : sorted.length > 0 ? sorted[sorted.length - 1] : 1;
  const edges = Array.from(
    { length: Math.max(0, binCount - 1) },
    (_unused, index) => lo + ((index + 1) * (hi - lo)) / binCount,
  );
  const colors = def.range ? [...def.range] : sampleSchemeColors(def.scheme, binCount, resolveScheme);
  return { colors, edges };
};

// ── channel 族 scale definition ───────────────────────────────────────────────────

/** 建 channel 取值用的数值序列：temporal 字段过 coerceTimestamp，其余取有限数。 */
const numericValuesOf = (values: Array<unknown>, ctx: ChannelResolveContext): Array<number> => {
  const toNumber = ctx.fieldType === DataFieldType.Temporal ? ctx.coerceTimestamp : ctx.toNumber;
  return values.map(toNumber).filter((value): value is number => value !== null);
};

const continuousColorOf = (
  ctx: ChannelResolveContext,
  evaluate: ColorScaleEvaluator,
): ((value: unknown) => string | undefined) => {
  const toNumber = ctx.fieldType === DataFieldType.Temporal ? ctx.coerceTimestamp : ctx.toNumber;
  return value => {
    const numeric = toNumber(value);
    return numeric === null ? undefined : evaluate(numeric);
  };
};

const withSequentialTheme = <TDef extends { range?: unknown; scheme?: string }>(
  def: TDef,
  ctx: ChannelResolveContext,
): TDef =>
  def.range !== undefined || def.scheme !== undefined || ctx.defaultSequentialScheme === undefined
    ? def
    : { ...def, scheme: ctx.defaultSequentialScheme };

const withDivergingTheme = <TDef extends { range?: unknown; scheme?: string }>(
  def: TDef,
  ctx: ChannelResolveContext,
): TDef =>
  def.range !== undefined || def.scheme !== undefined || ctx.defaultDivergingScheme === undefined
    ? def
    : { ...def, scheme: ctx.defaultDivergingScheme };

const ordinalScaleDefinition = defineScale<OrdinalScale>({
  family: 'channel',
  schema: OrdinalScaleSchema,
  // ordinal 接分类与未知（旧 makeColorResolver 把 undefined 字段类型当分类走 ordinal）
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === DataFieldType.Categorical,
  resolve: (def, values, ctx) => {
    // range 缺省取 plot 默认调色板（与旧 withPlotColorRange 一致）；domain 缺省按数据序去重
    const withPalette: OrdinalScale =
      def.range !== undefined ? def : ctx.defaultColors !== undefined ? { ...def, range: [...ctx.defaultColors] } : def;
    const ordinal = resolveOrdinalScale(withPalette, values);
    const domain = withPalette.domain ?? inferCategoryDomain(values);
    return {
      of: value => (typeof value === 'string' || typeof value === 'number' ? ordinal(value) : undefined),
      legendForm: 'swatch',
      domain,
      range: domain.map(category => ordinal(category)),
      scaleType: PlotScale.Ordinal,
    };
  },
});

const sequentialScaleDefinition = defineScale<SequentialColorScale>({
  family: 'channel',
  schema: SequentialColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === DataFieldType.Continuous || fieldType === DataFieldType.Temporal,
  resolve: (def, values, ctx) => {
    const numeric = numericValuesOf(values, ctx);
    const themedDef = withSequentialTheme(def, ctx);
    const evaluate = resolveSequentialColorScale(themedDef, numeric, ctx.resolveColorScheme);
    const [lo, hi] = def.domain ?? (numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)]);
    return {
      of: continuousColorOf(ctx, evaluate),
      legendForm: 'ramp',
      domain: [lo, hi],
      range: [],
      scaleType: PlotScale.Sequential,
    };
  },
});

const divergingScaleDefinition = defineScale<DivergingColorScale>({
  family: 'channel',
  schema: DivergingColorScaleSchema,
  // diverging 中点对时间无意义 → 仅接连续数值，拒 temporal（与旧 makeColorResolver temporal+diverging fail-loud 对齐）
  isFieldCompatible: fieldType => fieldType === DataFieldType.Continuous,
  resolve: (def, values, ctx) => {
    const numeric = numericValuesOf(values, ctx);
    const themedDef = withDivergingTheme(def, ctx);
    const evaluate = resolveDivergingColorScale(themedDef, numeric, ctx.resolveColorScheme);
    const extentRange: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
    const [lo, hi] = def.domain ? [def.domain[0], def.domain[def.domain.length - 1]] : extentRange;
    return {
      of: continuousColorOf(ctx, evaluate),
      legendForm: 'ramp',
      domain: [lo, hi],
      range: [],
      scaleType: PlotScale.Diverging,
    };
  },
});

const discretizedResolution = (
  scaleType: string,
  def: QuantizeColorScale | ThresholdColorScale | QuantileColorScale,
  values: Array<unknown>,
  ctx: ChannelResolveContext,
  evaluate: ColorScaleEvaluator,
): ChannelScaleResolution => {
  const numeric = numericValuesOf(values, ctx);
  const { colors, edges } = discretizedBins(def, numeric, ctx.resolveColorScheme);
  return { of: continuousColorOf(ctx, evaluate), legendForm: 'swatch', domain: [], range: colors, edges, scaleType };
};

const quantizeScaleDefinition = defineScale<QuantizeColorScale>({
  family: 'channel',
  schema: QuantizeColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === DataFieldType.Continuous || fieldType === DataFieldType.Temporal,
  resolve: (def, values, ctx) => {
    const themedDef = withSequentialTheme(def, ctx);
    return discretizedResolution(
      PlotScale.Quantize,
      themedDef,
      values,
      ctx,
      resolveQuantizeColorScale(themedDef, numericValuesOf(values, ctx), ctx.resolveColorScheme),
    );
  },
});

const thresholdScaleDefinition = defineScale<ThresholdColorScale>({
  family: 'channel',
  schema: ThresholdColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === DataFieldType.Continuous || fieldType === DataFieldType.Temporal,
  resolve: (def, values, ctx) => {
    const themedDef = withSequentialTheme(def, ctx);
    return discretizedResolution(
      PlotScale.Threshold,
      themedDef,
      values,
      ctx,
      resolveThresholdColorScale(themedDef, ctx.resolveColorScheme),
    );
  },
});

const quantileScaleDefinition = defineScale<QuantileColorScale>({
  family: 'channel',
  schema: QuantileColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === DataFieldType.Continuous || fieldType === DataFieldType.Temporal,
  resolve: (def, values, ctx) => {
    const themedDef = withSequentialTheme(def, ctx);
    return discretizedResolution(
      PlotScale.Quantile,
      themedDef,
      values,
      ctx,
      resolveQuantileColorScale(themedDef, numericValuesOf(values, ctx), ctx.resolveColorScheme),
    );
  },
});

/** channel 族 scale definition（分类 1 + 连续色 2 + 离散化 3 = 6）：产视觉量（颜色），喂 color 通道 + legend。 */
export const COLOR_SCALE_DEFINITIONS: ReadonlyArray<AnyScaleDefinition> = [
  ordinalScaleDefinition,
  sequentialScaleDefinition,
  divergingScaleDefinition,
  quantizeScaleDefinition,
  thresholdScaleDefinition,
  quantileScaleDefinition,
] as ReadonlyArray<AnyScaleDefinition>;
