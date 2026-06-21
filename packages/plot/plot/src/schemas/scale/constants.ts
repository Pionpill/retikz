import type { ValueOf } from '@retikz/core';

/**
 * scale 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'linear'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotScale.x)（不用 z.enum）；后续加 ordinal / time…
 */
export const PlotScale = {
  /** 连续线性映射 */
  Linear: 'linear',
  /** 分类带：每个类别占一段等宽 band（柱状图 x 轴） */
  Band: 'band',
  /** 分类点：band 的退化，类别落在等距点上（分类轴上的折线 / 散点） */
  Point: 'point',
  /** 序数：分类域 → 离散输出域（典型为颜色），多系列着色主力 */
  Ordinal: 'ordinal',
  /** 时间：连续时间映射（epoch 毫秒），刻度落人类可读时间边界（UTC） */
  Time: 'time',
  /** 对数：连续对数映射；domain / value 必须全正（0 与负值不可绘，lowering 跳过 / 拒绝） */
  Log: 'log',
  /** 幂：连续幂映射 y = m·x^exponent + b */
  Pow: 'pow',
  /** 平方根：pow exponent 0.5 的常用别名（面积感知正确；size 通道默认派生到此）；domain / value 必须 ≥ 0 */
  Sqrt: 'sqrt',
  /** 对称对数：近零线性、尾部对数，能处理跨零 / 含负的宽幅数据（log 不能）；仅 point / line */
  Symlog: 'symlog',
  /** 径向：输出半径使「编码面积」正比于值（开方映射）；极坐标 / 玫瑰图（南丁格尔）的天然值 scale */
  Radial: 'radial',
  /** 连续顺序色阶：单调量 domain → 单方向色带（低→高），continuous / temporal color 主力 */
  Sequential: 'sequential',
  /** 连续发散色阶：有中点的量 domain → 两侧异色色带（中点淡），盈亏 / 偏离均值 */
  Diverging: 'diverging',
  /** 等宽离散化：连续 domain 等宽切 count 段 → 离散 color 档（choropleth / 均匀分布连续量） */
  Quantize: 'quantize',
  /** 阈值离散化：用户自定义断点切档 → 离散 color 档（断点须升序，色数 = 断点数 + 1；业务阈值 / 告警） */
  Threshold: 'threshold',
  /** 分位离散化：按数据分位切 count 档（每档样本数约等）→ 离散 color 档（偏斜数据 / 抗离群） */
  Quantile: 'quantile',
} as const;

/** scale 类型 */
export type PlotScaleValue = ValueOf<typeof PlotScale>;

/**
 * 命名配色方案词表（暴露给用户；成员值即 IR 判别串，裸字面量 `'viridis'` 同样可用）
 * @description 闭枚举进 IR，取 d3-scale-chromatic 子集；sequential 系单 / 多色相 + diverging 系两侧异色，
 *   lowering 经对应 interpolator 求值。不把 interpolator 函数塞进 IR（IR 须 100% JSON 可序列化）。
 */
export const PlotColorScheme = {
  /** sequential 单色相蓝 */
  Blues: 'blues',
  /** sequential 单色相绿 */
  Greens: 'greens',
  /** sequential 单色相灰 */
  Greys: 'greys',
  /** sequential 单色相橙 */
  Oranges: 'oranges',
  /** sequential 单色相紫 */
  Purples: 'purples',
  /** sequential 单色相红 */
  Reds: 'reds',
  /** sequential 多色相（感知均匀、色盲友好；sequential 默认） */
  Viridis: 'viridis',
  /** sequential 多色相 magma */
  Magma: 'magma',
  /** sequential 多色相 inferno */
  Inferno: 'inferno',
  /** sequential 多色相 plasma */
  Plasma: 'plasma',
  /** sequential 多色相 cividis（色盲友好） */
  Cividis: 'cividis',
  /** sequential 多色相 turbo */
  Turbo: 'turbo',
  /** diverging 棕—蓝绿 */
  BrBG: 'brbg',
  /** diverging 紫红—绿 */
  PRGn: 'prgn',
  /** diverging 粉红—黄绿 */
  PiYG: 'piyg',
  /** diverging 紫—橙 */
  PuOr: 'puor',
  /** diverging 红—蓝（diverging 默认） */
  RdBu: 'rdbu',
  /** diverging 红—灰 */
  RdGy: 'rdgy',
  /** diverging 红—黄—蓝 */
  RdYlBu: 'rdylbu',
  /** diverging 红—黄—绿 */
  RdYlGn: 'rdylgn',
  /** diverging 光谱（红—橙—黄—绿—蓝） */
  Spectral: 'spectral',
} as const;

/** 配色方案名 */
export type PlotColorSchemeValue = ValueOf<typeof PlotColorScheme>;

/** 内置配色方案名集；供 scheme 字段静态识别与 lowering 期内置/自定义分流（模块常量，非 zod） */
export const BUILTIN_COLOR_SCHEMES = new Set<string>(Object.values(PlotColorScheme));

/** 内置 scale type 集；供 CustomScaleSchema 排除内置判别串（模块常量，非 zod） */
export const BUILTIN_SCALE_TYPES = new Set<string>(Object.values(PlotScale));
