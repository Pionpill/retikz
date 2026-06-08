import { extent } from 'd3-array';
import {
  type ScaleBand,
  type ScaleContinuousNumeric,
  type ScaleLinear,
  type ScalePoint,
  type ScaleTime,
  scaleBand,
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scalePoint,
  scalePow,
  scaleUtc,
} from 'd3-scale';
import {
  interpolateBlues,
  interpolateBrBG,
  interpolateCividis,
  interpolateGreens,
  interpolateGreys,
  interpolateInferno,
  interpolateMagma,
  interpolateOranges,
  interpolatePRGn,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePuOr,
  interpolatePurples,
  interpolateRdBu,
  interpolateRdGy,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateReds,
  interpolateSpectral,
  interpolateTurbo,
  interpolateViridis,
  schemeCategory10,
} from 'd3-scale-chromatic';
import { type BandScale, type ColorScheme, type DivergingColorScale, type FieldDef, type FieldType, type LogScale, type OrdinalScale, PlotColorScheme, PlotFieldType, PlotScale, type PointScale, type PowScale, type ScalarValue, type Scale, type ScaleType, type SequentialColorScale, type SqrtScale, type TimeScale } from '../ir';
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
export const scaleTicks = (scale: ScaleContinuousNumeric<number, number>, count: number = DEFAULT_TICK_COUNT): TickSet => {
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

/** FieldDef.order 的取值类型（单一真源派生自 schema，避免手写第二份） */
export type CategoryOrder = NonNullable<FieldDef['order']>;

/**
 * 按 order 计算有序的分类域：在 inferCategoryDomain 去重保序基础上再排
 * @description order='data'/undefined → 现状出现序去重；'ascending'/'descending' → 全数值按数值比、否则统一 String localeCompare（descending 反序）；
 *   Array → 以数组为类别序，数据出现但不在数组里的去重类别按出现序追加末尾（数组里有、数据无的值保留作空类别）。
 */
export const orderedCategoryDomain = (values: Array<unknown>, order: CategoryOrder | undefined): Array<string | number> => {
  const deduped = inferCategoryDomain(values);
  if (order === undefined || order === 'data') return deduped;
  if (order === 'ascending' || order === 'descending') {
    const allNumber = deduped.every(value => typeof value === 'number');
    const sorted = [...deduped].sort((a, b) => (allNumber ? (a as number) - (b as number) : String(a).localeCompare(String(b))));
    return order === 'descending' ? sorted.reverse() : sorted;
  }
  // Array：数组序优先；数据出现但不在数组里的类别按出现序追加末尾
  const inArray = new Set<string | number>(order);
  const appended = deduped.filter(value => !inArray.has(value));
  return [...order, ...appended];
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

/** 配色方案名 → d3-scale-chromatic interpolator（t∈[0,1] → 颜色串）；命名 scheme 进 IR、求值期映射到函数（函数不进 IR） */
const SCHEME_INTERPOLATORS: Record<ColorScheme, (t: number) => string> = {
  [PlotColorScheme.Blues]: interpolateBlues,
  [PlotColorScheme.Greens]: interpolateGreens,
  [PlotColorScheme.Greys]: interpolateGreys,
  [PlotColorScheme.Oranges]: interpolateOranges,
  [PlotColorScheme.Purples]: interpolatePurples,
  [PlotColorScheme.Reds]: interpolateReds,
  [PlotColorScheme.Viridis]: interpolateViridis,
  [PlotColorScheme.Magma]: interpolateMagma,
  [PlotColorScheme.Inferno]: interpolateInferno,
  [PlotColorScheme.Plasma]: interpolatePlasma,
  [PlotColorScheme.Cividis]: interpolateCividis,
  [PlotColorScheme.Turbo]: interpolateTurbo,
  [PlotColorScheme.BrBG]: interpolateBrBG,
  [PlotColorScheme.PRGn]: interpolatePRGn,
  [PlotColorScheme.PiYG]: interpolatePiYG,
  [PlotColorScheme.PuOr]: interpolatePuOr,
  [PlotColorScheme.RdBu]: interpolateRdBu,
  [PlotColorScheme.RdGy]: interpolateRdGy,
  [PlotColorScheme.RdYlBu]: interpolateRdYlBu,
  [PlotColorScheme.RdYlGn]: interpolateRdYlGn,
  [PlotColorScheme.Spectral]: interpolateSpectral,
};

/** sequential 缺省配色（感知均匀、色盲友好） */
const DEFAULT_SEQUENTIAL_SCHEME = PlotColorScheme.Viridis;
/** diverging 缺省配色（两侧红蓝、中点淡） */
const DEFAULT_DIVERGING_SCHEME = PlotColorScheme.RdBu;

/**
 * d3 颜色串（`rgb(r, g, b)` / `#rgb` / `#rrggbb`）归一化为 6 位十六进制
 * @description interpolator 与 scaleLinear 颜色插值产物形态不一（hex 或 rgb()）；统一成 hex 使产物稳定、可序列化进 core fill / stroke。
 *   解析不出 r/g/b 三元（命名色 / 已是其它格式）→ 原样返回。
 */
const toHexColor = (color: string): string => {
  const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (!match) return color;
  const channel = (text: string): string =>
    Math.max(0, Math.min(255, Math.round(Number(text))))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(match[1])}${channel(match[2])}${channel(match[3])}`;
};

/** 行→连续色：数值（含时间戳）→ 颜色串；非有限值 → undefined（调用方回退默认色） */
export type ColorScaleEvaluator = (value: number) => string;

/**
 * sequential 颜色 scale 求值：单调量 domain [min, max] → 单方向色带
 * @description domain 缺省从数据 [min, max] 推断；显式 domain 须 min < max（违反 fail-loud）。
 *   range 给定（两端颜色）→ 经 scaleLinear 颜色插值覆盖 scheme；否则用命名 scheme interpolator（缺省 viridis）。
 *   单值数据（min == max 推断）退化为常量取色（端点），不崩。
 */
export const resolveSequentialColorScale = (def: SequentialColorScale, values: Array<number>): ColorScaleEvaluator => {
  const [lo, hi] = def.domain ?? safeExtent(values);
  if (def.domain && def.domain[0] >= def.domain[1]) {
    throw new Error(`lowerPlots: sequential color scale "${def.name}" domain must satisfy min < max (got [${def.domain[0]}, ${def.domain[1]}])`);
  }
  if (def.range) {
    const scale = scaleLinear<string, string>()
      .domain([lo, hi])
      .range([def.range[0], def.range[1]])
      .clamp(true);
    return value => toHexColor(scale(value));
  }
  const interpolator = SCHEME_INTERPOLATORS[def.scheme ?? DEFAULT_SEQUENTIAL_SCHEME];
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
export const resolveDivergingColorScale = (def: DivergingColorScale, values: Array<number>): ColorScaleEvaluator => {
  let low: number;
  let mid: number;
  let high: number;
  if (def.domain) {
    [low, mid, high] = def.domain;
    if (!(low < mid && mid < high)) {
      throw new Error(`lowerPlots: diverging color scale "${def.name}" domain must satisfy low < mid < high (got [${low}, ${mid}, ${high}])`);
    }
  } else {
    const [lo, hi] = safeExtent(values);
    low = lo;
    high = hi;
    mid = (lo + hi) / 2;
  }
  if (def.range) {
    const scale = scaleLinear<string, string>()
      .domain([low, mid, high])
      .range([def.range[0], def.range[1], def.range[2]])
      .clamp(true);
    return value => toHexColor(scale(value));
  }
  const interpolator = SCHEME_INTERPOLATORS[def.scheme ?? DEFAULT_DIVERGING_SCHEME];
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

/** 字段值 → epoch ms（Date 实例 / 数值原样 / ISO 字符串走 Date.parse；其余 → null） */
export const toTimestamp = (value: unknown): number | null => {
  if (value instanceof Date) {
    const stamp = value.getTime();
    return Number.isNaN(stamp) ? null : stamp;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    // ISO guard（与推断同一套）：拒 YYYY/MM/DD、无时区 datetime、裸数字串，避免误解析
    if (!isIsoDateString(value)) return null;
    // 空格分隔（SQL 时间戳）归一化成 T：ECMAScript 只保证 T 分隔的跨引擎一致解析
    const parsed = Date.parse(value.replace(' ', 'T'));
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
 * 建对数 scale（d3 scaleLog，全正 domain）
 * @description 显式 domain 含 0 / 负值 → fail-loud；缺省从正值 extent 推断（空集回退 [1, 10]）。
 *   非正数据值不在此拦截——由 continuousPositionScale 的 isValidInput 跳过（NaN），与连续 scale 跳过非有限值同理。
 */
export const resolveLogScale = (
  def: LogScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): ScaleContinuousNumeric<number, number> => {
  if (def.domain && (def.domain[0] <= 0 || def.domain[1] <= 0)) {
    throw new Error(`lowerPlots: log scale "${def.name}" domain must be strictly positive (got [${def.domain[0]}, ${def.domain[1]}])`);
  }
  const positives = values.filter(value => value > 0);
  const [lo, hi] = extent(positives);
  const scale = scaleLog()
    .base(def.base ?? 10)
    .domain([...(def.domain ?? (lo === undefined ? [1, 10] : [lo, hi]))])
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建幂 scale（d3 scalePow）
 * @description 非整数 exponent + 显式 domain 含负值 → fail-loud（避免 d3 sign-preserving 反直觉）；
 *   整数 exponent 允许负 domain。exponent 缺省 2。
 */
export const resolvePowScale = (
  def: PowScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): ScaleContinuousNumeric<number, number> => {
  const exponent = def.exponent ?? 2;
  if (def.domain && !Number.isInteger(exponent) && (def.domain[0] < 0 || def.domain[1] < 0)) {
    throw new Error(`lowerPlots: pow scale "${def.name}" with non-integer exponent ${exponent} requires a non-negative domain (got [${def.domain[0]}, ${def.domain[1]}])`);
  }
  const scale = scalePow()
    .exponent(exponent)
    .domain([...(def.domain ?? safeExtent(values))])
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 建平方根 scale（d3 scalePow exponent 0.5；面积感知）
 * @description 显式 domain 含负值 → fail-loud；缺省从非负值 extent 推断。负数据值由 isValidInput 跳过。
 */
export const resolveSqrtScale = (
  def: SqrtScale,
  values: Array<number>,
  fallbackRange: readonly [number, number],
): ScaleContinuousNumeric<number, number> => {
  if (def.domain && (def.domain[0] < 0 || def.domain[1] < 0)) {
    throw new Error(`lowerPlots: sqrt scale "${def.name}" domain must be non-negative (got [${def.domain[0]}, ${def.domain[1]}])`);
  }
  const scale = scalePow()
    .exponent(0.5)
    .domain([...(def.domain ?? safeExtent(values.filter(value => value >= 0)))])
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 连续数值 scale → PositionScale（linear / log / pow / sqrt 共用）
 * @description bandwidth=0；isValidInput 拦不可绘的值（log ≤ 0、sqrt / 非整数幂 < 0）→ NaN 跳过；
 *   投影结果非有限（log(0)=-∞）也归 NaN，与连续 scale 跳过非有限值一致。
 */
export const continuousPositionScale = (
  scale: ScaleContinuousNumeric<number, number>,
  isValidInput: (value: unknown) => boolean = isFiniteNumber,
): PositionScale => ({
  coordinate: value => {
    if (!isValidInput(value)) return NaN;
    const coordinate = scale(value as number);
    return Number.isFinite(coordinate) ? coordinate : NaN;
  },
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

/**
 * 按字段类型派生默认位置 scale 定义（type-driven 选型）
 * @description continuous→linear、temporal→time、categorical→band；
 *   undefined（无字段绑定，如全常量通道）→ linear 兜底。仅在 coordinate 省略 scale 绑定时调用。
 */
export const deriveScale = (fieldType: FieldType | undefined, name: string): Scale => {
  switch (fieldType) {
    case PlotFieldType.Temporal:
      return { type: PlotScale.Time, name };
    case PlotFieldType.Categorical:
      return { type: PlotScale.Band, name };
    default:
      return { type: PlotScale.Linear, name };
  }
};

/**
 * 类型 ↔ scale 兼容校验（fail-loud，不强转）
 * @description 仅拒明确错配：连续 scale（linear/time）配分类字段（categorical）、分类 scale（band/point）配 temporal。
 *   continuous 灵活（可作连续亦可作分类带），不拦。
 */
export const assertScaleFieldCompatible = (role: string, scaleType: ScaleType, fieldType: FieldType, scaleName: string): void => {
  const continuous =
    scaleType === PlotScale.Linear ||
    scaleType === PlotScale.Time ||
    scaleType === PlotScale.Log ||
    scaleType === PlotScale.Pow ||
    scaleType === PlotScale.Sqrt;
  const categorical = scaleType === PlotScale.Band || scaleType === PlotScale.Point;
  const fieldCategorical = fieldType === PlotFieldType.Categorical;
  if (continuous && fieldCategorical) {
    throw new Error(`lowerPlots: coordinate.${role} scale "${scaleName}" (${scaleType}) incompatible with ${fieldType} field; use band/point`);
  }
  if (categorical && fieldType === PlotFieldType.Temporal) {
    throw new Error(`lowerPlots: coordinate.${role} scale "${scaleName}" (${scaleType}) incompatible with temporal field; use time`);
  }
};

/**
 * L1 守卫：非线性连续 scale（log / pow / sqrt）不能作 interval / area 的值轴
 * @description 柱 / 面积的 baseline 含 0，与对数 / 幂的结构冲突（log(0)=-∞）。命中即 fail-loud，
 *   提示改用 point / line（或将来的显式正 baseline 支持）。仅查值轴（cartesian=y、polar=radius）。
 */
export const assertBaselineScaleCompatible = (valueScaleType: ScaleType, marks: ReadonlyArray<{ type: string }>): void => {
  const nonlinear = valueScaleType === PlotScale.Log || valueScaleType === PlotScale.Pow || valueScaleType === PlotScale.Sqrt;
  if (!nonlinear) return;
  if (marks.some(mark => mark.type === 'interval' || mark.type === 'area')) {
    throw new Error(
      'nonlinear continuous scale (log/pow/sqrt) cannot be used with interval/area because their baseline includes 0; use point/line or wait for explicit positive baseline support',
    );
  }
};

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
    case PlotScale.Log:
      return continuousPositionScale(resolveLogScale(def, values.filter(isFiniteNumber), fallbackRange), value => isFiniteNumber(value) && value > 0);
    case PlotScale.Sqrt:
      return continuousPositionScale(resolveSqrtScale(def, values.filter(isFiniteNumber), fallbackRange), value => isFiniteNumber(value) && value >= 0);
    case PlotScale.Pow: {
      const integerExponent = Number.isInteger(def.exponent ?? 2);
      const isValidInput = integerExponent ? isFiniteNumber : (value: unknown) => isFiniteNumber(value) && value >= 0;
      return continuousPositionScale(resolvePowScale(def, values.filter(isFiniteNumber), fallbackRange), isValidInput);
    }
    case PlotScale.Ordinal:
      throw new Error(`resolvePositionScale: ordinal scale "${def.name}" cannot drive a positional (x/y) channel`);
    case PlotScale.Sequential:
    case PlotScale.Diverging:
      throw new Error(`resolvePositionScale: ${def.type} color scale "${def.name}" cannot drive a positional (x/y) channel; color scales bind the color channel only`);
  }
};
