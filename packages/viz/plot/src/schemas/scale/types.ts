import type { infer as ZodInfer } from 'zod';

import type {
  BandScaleSchema,
  CategoryValueSchema,
  CustomScaleSchema,
  DivergingColorScaleSchema,
  DomainPaddingSchema,
  LinearScaleSchema,
  LogScaleSchema,
  OrdinalScaleSchema,
  PlotScaleTypeSchema,
  PointScaleSchema,
  PowScaleSchema,
  QuantileColorScaleSchema,
  QuantizeColorScaleSchema,
  RadialScaleSchema,
  ScaleOperationSchema,
  ScaleSchema,
  SequentialColorScaleSchema,
  SqrtScaleSchema,
  SymlogScaleSchema,
  ThresholdColorScaleSchema,
  TimeScaleSchema,
} from './schema';

/** Plot可接受的开放scale type */
export type PlotScaleType = ZodInfer<typeof PlotScaleTypeSchema>;

/** 分类标量：类别取值 */
export type IRPlotCategoryValue = ZodInfer<typeof CategoryValueSchema>;

/** position scale 的 domain padding */
export type IRPlotDomainPadding = ZodInfer<typeof DomainPaddingSchema>;

/** 线性 scale */
export type IRPlotLinearScale = ZodInfer<typeof LinearScaleSchema>;

/** 将离散类别映射为带宽区间的比例尺 */
export type IRPlotBandScale = ZodInfer<typeof BandScaleSchema>;

/** 将离散类别映射为等距点的比例尺 */
export type IRPlotPointScale = ZodInfer<typeof PointScaleSchema>;

/** ordinal scale（分类 → 离散输出，颜色） */
export type IRPlotOrdinalScale = ZodInfer<typeof OrdinalScaleSchema>;

/** time scale（连续时间，epoch ms） */
export type IRPlotTimeScale = ZodInfer<typeof TimeScaleSchema>;

/** log scale（连续对数，domain 全正） */
export type IRPlotLogScale = ZodInfer<typeof LogScaleSchema>;

/** pow scale（连续幂） */
export type IRPlotPowScale = ZodInfer<typeof PowScaleSchema>;

/** sqrt scale（连续平方根，面积感知；size 通道默认派生目标） */
export type IRPlotSqrtScale = ZodInfer<typeof SqrtScaleSchema>;

/** symlog scale（对称对数，近零线性、尾部对数；跨零 / 含负的宽幅数据） */
export type IRPlotSymlogScale = ZodInfer<typeof SymlogScaleSchema>;

/** radial scale（径向，面积感知半径；极坐标 / 玫瑰图值轴） */
export type IRPlotRadialScale = ZodInfer<typeof RadialScaleSchema>;

/** sequential color scale（连续顺序色阶；continuous / temporal color 主力） */
export type IRPlotSequentialColorScale = ZodInfer<typeof SequentialColorScaleSchema>;

/** diverging color scale（连续发散色阶；有中点的量两侧异色） */
export type IRPlotDivergingColorScale = ZodInfer<typeof DivergingColorScaleSchema>;

/** quantize color scale（等宽离散化；连续 domain 等宽切档 → 离散色） */
export type IRPlotQuantizeColorScale = ZodInfer<typeof QuantizeColorScaleSchema>;

/** threshold color scale（阈值离散化；自定义升序断点切档 → 离散色） */
export type IRPlotThresholdColorScale = ZodInfer<typeof ThresholdColorScaleSchema>;

/** quantile color scale（分位离散化；按数据分位切档 → 离散色，无显式数值 domain） */
export type IRPlotQuantileColorScale = ZodInfer<typeof QuantileColorScaleSchema>;

/** 比例尺联合，包含连续、离散、时间、颜色及分段映射类型 */
export type IRPlotScale = ZodInfer<typeof ScaleSchema>;

/** 自定义 scale operation（运行时由 ScaleDefinition 精确校验并解析；type 排除内置） */
export type IRPlotCustomScale = ZodInfer<typeof CustomScaleSchema>;

/** scale operation（内置精确 13-union ∪ 自定义 type 开放配置） */
export type IRPlotScaleOperation = ZodInfer<typeof ScaleOperationSchema>;

/** 图元驱动的自动留白声明 */
export type IRPlotMarkDomainPadding = Extract<IRPlotDomainPadding, { kind: 'mark' }>;
