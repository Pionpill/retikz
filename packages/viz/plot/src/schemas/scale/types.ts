import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { PlotColorScheme, PlotScale } from './constants';
import type {
  BandScaleSchema,
  CategoryValueSchema,
  CustomScaleSchema,
  DivergingColorScaleSchema,
  DomainPaddingSchema,
  LinearScaleSchema,
  LogScaleSchema,
  OrdinalScaleSchema,
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

/** scale 类型 */
export type PlotScaleValue = ValueOf<typeof PlotScale>;

/** 内置命名配色方案名 */
export type PlotColorSchemeValue = ValueOf<typeof PlotColorScheme>;

/** 分类标量：类别取值 */
export type IRPlotCategoryValue = ZodInfer<typeof CategoryValueSchema>;

/** position scale 的 domain padding */
export type IRPlotDomainPadding = ZodInfer<typeof DomainPaddingSchema>;

/** 线性 scale */
export type IRPlotLinearScale = ZodInfer<typeof LinearScaleSchema>;

/** band scale */
export type IRPlotBandScale = ZodInfer<typeof BandScaleSchema>;

/** point scale */
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

/** scale（linear / band / point / ordinal / time / log / pow / sqrt / symlog / radial / sequential / diverging / quantize / threshold / quantile） */
export type IRPlotScale = ZodInfer<typeof ScaleSchema>;

/** 自定义 scale operation（运行时由 ScaleDefinition 精确校验并解析；type 排除内置） */
export type IRPlotCustomScale = ZodInfer<typeof CustomScaleSchema>;

/** scale operation（内置精确 13-union ∪ 自定义 type 开放配置） */
export type IRPlotScaleOperation = ZodInfer<typeof ScaleOperationSchema>;
