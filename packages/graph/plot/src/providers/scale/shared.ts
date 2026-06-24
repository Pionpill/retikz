import { extent as d3Extent } from 'd3-array';
import type { ScaleContinuousNumeric as D3ScaleContinuousNumeric } from 'd3-scale';
import {
  interpolateBlues as d3InterpolateBlues,
  interpolateBrBG as d3InterpolateBrBG,
  interpolateCividis as d3InterpolateCividis,
  interpolateGreens as d3InterpolateGreens,
  interpolateGreys as d3InterpolateGreys,
  interpolateInferno as d3InterpolateInferno,
  interpolateMagma as d3InterpolateMagma,
  interpolateOranges as d3InterpolateOranges,
  interpolatePRGn as d3InterpolatePRGn,
  interpolatePiYG as d3InterpolatePiYG,
  interpolatePlasma as d3InterpolatePlasma,
  interpolatePuOr as d3InterpolatePuOr,
  interpolatePurples as d3InterpolatePurples,
  interpolateRdBu as d3InterpolateRdBu,
  interpolateRdGy as d3InterpolateRdGy,
  interpolateRdYlBu as d3InterpolateRdYlBu,
  interpolateRdYlGn as d3InterpolateRdYlGn,
  interpolateReds as d3InterpolateReds,
  interpolateSpectral as d3InterpolateSpectral,
  interpolateTurbo as d3InterpolateTurbo,
  interpolateViridis as d3InterpolateViridis,
  schemeCategory10 as d3SchemeCategory10,
} from 'd3-scale-chromatic';
import type { TickSet } from '../../contract';
import { BUILTIN_COLOR_SCHEMES, PlotColorScheme, type PlotColorSchemeValue } from './constants';

/** 默认目标刻度数（d3 ticks 的提示值，非硬约束——实际数量按 nice 区间取整定） */
export const DEFAULT_TICK_COUNT = 5;

/** 默认 Plot 分类调色板：来自 d3-scale-chromatic schemeCategory10 */
export const DEFAULT_PLOT_COLORS = [...d3SchemeCategory10];

/** 从一组数值求 [min, max]；空集 / 全非有限回退 [0, 1]（d3 extent 对空集返回 [undefined, undefined]） */
export const safeExtent = (values: Array<number>): [number, number] => {
  // d3 extent 空集返回 [undefined, undefined]（相关元组：lo 为 undefined 则 hi 必然也是）
  const [lo, hi] = d3Extent(values);
  return lo === undefined ? [0, 1] : [lo, hi];
};

/**
 * 取一个线性 scale 的刻度值 + 格式化标签
 * @description 刻度值 / 标签只依赖 domain + count（与 range 无关）——故可在 range 定下来前先算，供布局估算 margin（ADR-03）。
 *   axis 与同维 grid 复用同一 TickSet（同源）。
 */
export const scaleTicks = (scale: D3ScaleContinuousNumeric<number, number>, count: number = DEFAULT_TICK_COUNT): TickSet => {
  const values = scale.ticks(count);
  const format = scale.tickFormat(count);
  return { values, labels: values.map(format) };
};

/** scheme 名 → interpolator（t∈[0,1] → 颜色串）；先查内置、再查自定义；未注册 throw。 */
export type ColorSchemeResolver = (name: string) => (t: number) => string;

/** 配色方案名 → d3-scale-chromatic interpolator（t∈[0,1] → 颜色串）；命名 scheme 进 IR、求值期映射到函数（函数不进 IR） */
export const SCHEME_INTERPOLATORS: Record<PlotColorSchemeValue, (t: number) => string> = {
  [PlotColorScheme.Blues]: d3InterpolateBlues,
  [PlotColorScheme.Greens]: d3InterpolateGreens,
  [PlotColorScheme.Greys]: d3InterpolateGreys,
  [PlotColorScheme.Oranges]: d3InterpolateOranges,
  [PlotColorScheme.Purples]: d3InterpolatePurples,
  [PlotColorScheme.Reds]: d3InterpolateReds,
  [PlotColorScheme.Viridis]: d3InterpolateViridis,
  [PlotColorScheme.Magma]: d3InterpolateMagma,
  [PlotColorScheme.Inferno]: d3InterpolateInferno,
  [PlotColorScheme.Plasma]: d3InterpolatePlasma,
  [PlotColorScheme.Cividis]: d3InterpolateCividis,
  [PlotColorScheme.Turbo]: d3InterpolateTurbo,
  [PlotColorScheme.BrBG]: d3InterpolateBrBG,
  [PlotColorScheme.PRGn]: d3InterpolatePRGn,
  [PlotColorScheme.PiYG]: d3InterpolatePiYG,
  [PlotColorScheme.PuOr]: d3InterpolatePuOr,
  [PlotColorScheme.RdBu]: d3InterpolateRdBu,
  [PlotColorScheme.RdGy]: d3InterpolateRdGy,
  [PlotColorScheme.RdYlBu]: d3InterpolateRdYlBu,
  [PlotColorScheme.RdYlGn]: d3InterpolateRdYlGn,
  [PlotColorScheme.Spectral]: d3InterpolateSpectral,
};

/** 内置 scheme 名 → interpolator；未知名 throw（提示经 options.colorSchemes 注册）。自定义解析由调用方在外层叠加。 */
export const builtinColorSchemeInterpolator: ColorSchemeResolver = name => {
  if (!BUILTIN_COLOR_SCHEMES.has(name)) {
    throw new Error(`lowerPlots: unknown color scheme "${name}"; register it via options.colorSchemes`);
  }
  return SCHEME_INTERPOLATORS[name as PlotColorSchemeValue];
};

/**
 * 建 scheme 解析器：先查内置 SCHEME_INTERPOLATORS、再查自定义 options.colorSchemes，未命中 throw。
 * @description interpolator 函数不进 IR；IR 只存 scheme 名串，求值期经此解析为函数（含自定义命名配色）。
 */
export const makeColorSchemeResolver = (custom?: Record<string, (t: number) => string>): ColorSchemeResolver => name => {
  if (BUILTIN_COLOR_SCHEMES.has(name)) return SCHEME_INTERPOLATORS[name as PlotColorSchemeValue];
  const customInterpolator = custom?.[name];
  if (customInterpolator !== undefined) return customInterpolator;
  throw new Error(`lowerPlots: unknown color scheme "${name}"; register it via options.colorSchemes`);
};

/**
 * d3 颜色串（`rgb(r, g, b)` / `#rgb` / `#rrggbb`）归一化为 6 位十六进制
 * @description interpolator 与 scaleLinear 颜色插值产物形态不一（hex 或 rgb()）；统一成 hex 使产物稳定、可序列化进 core fill / stroke。
 *   解析不出 r/g/b 三元（命名色 / 已是其它格式）→ 原样返回。
 */
export const toHexColor = (color: string): string => {
  const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (!match) return color;
  const channel = (text: string): string =>
    Math.max(0, Math.min(255, Math.round(Number(text))))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(match[1])}${channel(match[2])}${channel(match[3])}`;
};

/** 离散化色阶缺省配色（与 sequential 同——感知均匀、色盲友好） */
const DEFAULT_DISCRETE_SCHEME = PlotColorScheme.Viridis;

/**
 * 从命名 scheme 等距采样 count 个离散色（[0,1] 上均匀取点喂 interpolator，归一化为 hex）
 * @description 离散化 scale（quantize / threshold / quantile）的档色单一来源：count 档 → count 个色。
 *   count==1 取 scheme 中点（0.5）；count≥2 端点含 0 与 1（首末档取 scheme 两端）。与 sequential 连续采样同源 interpolator。
 */
export const sampleSchemeColors = (scheme: string | undefined, count: number, resolveScheme: ColorSchemeResolver = builtinColorSchemeInterpolator): Array<string> => {
  const interpolator = resolveScheme(scheme ?? DEFAULT_DISCRETE_SCHEME);
  if (count <= 1) return [toHexColor(interpolator(0.5))];
  return Array.from({ length: count }, (_unused, index) => toHexColor(interpolator(index / (count - 1))));
};

/** 行→连续色：数值（含时间戳）→ 颜色串；非有限值 → undefined（调用方回退默认色） */
export type ColorScaleEvaluator = (value: number) => string;
