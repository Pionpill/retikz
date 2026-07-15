/**
 * scale 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'linear'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotScale.x)（不用 z.enum）
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

/** 内置 scale type 集；供 CustomScaleSchema 排除内置判别串（模块常量，非 zod） */
export const BUILTIN_SCALE_TYPES = new Set<string>(Object.values(PlotScale));
