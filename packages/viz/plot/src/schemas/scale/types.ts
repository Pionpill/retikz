import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { PlotScale } from './constants';
import type {
  BandScaleSchema,
  CategoryValueSchema,
  CustomScaleSchema,
  DivergingColorScaleSchema,
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

/** 分类标量：类别取值 */
export type IRPlotCategoryValue = z.infer<typeof CategoryValueSchema>;

/** 线性 scale */
export type IRPlotLinearScale = z.infer<typeof LinearScaleSchema>;

/** band scale */
export type IRPlotBandScale = z.infer<typeof BandScaleSchema>;

/** point scale */
export type IRPlotPointScale = z.infer<typeof PointScaleSchema>;

/** ordinal scale（分类 → 离散输出，颜色） */
export type IRPlotOrdinalScale = z.infer<typeof OrdinalScaleSchema>;

/** time scale（连续时间，epoch ms） */
export type IRPlotTimeScale = z.infer<typeof TimeScaleSchema>;

/** log scale（连续对数，domain 全正） */
export type IRPlotLogScale = z.infer<typeof LogScaleSchema>;

/** pow scale（连续幂） */
export type IRPlotPowScale = z.infer<typeof PowScaleSchema>;

/** sqrt scale（连续平方根，面积感知；size 通道默认派生目标） */
export type IRPlotSqrtScale = z.infer<typeof SqrtScaleSchema>;

/** symlog scale（对称对数，近零线性、尾部对数；跨零 / 含负的宽幅数据） */
export type IRPlotSymlogScale = z.infer<typeof SymlogScaleSchema>;

/** radial scale（径向，面积感知半径；极坐标 / 玫瑰图值轴） */
export type IRPlotRadialScale = z.infer<typeof RadialScaleSchema>;

/** sequential color scale（连续顺序色阶；continuous / temporal color 主力） */
export type IRPlotSequentialColorScale = z.infer<typeof SequentialColorScaleSchema>;

/** diverging color scale（连续发散色阶；有中点的量两侧异色） */
export type IRPlotDivergingColorScale = z.infer<typeof DivergingColorScaleSchema>;

/** quantize color scale（等宽离散化；连续 domain 等宽切档 → 离散色） */
export type IRPlotQuantizeColorScale = z.infer<typeof QuantizeColorScaleSchema>;

/** threshold color scale（阈值离散化；自定义升序断点切档 → 离散色） */
export type IRPlotThresholdColorScale = z.infer<typeof ThresholdColorScaleSchema>;

/** quantile color scale（分位离散化；按数据分位切档 → 离散色，无显式数值 domain） */
export type IRPlotQuantileColorScale = z.infer<typeof QuantileColorScaleSchema>;

/** scale（linear / band / point / ordinal / time / log / pow / sqrt / symlog / radial / sequential / diverging / quantize / threshold / quantile） */
export type IRPlotScale = z.infer<typeof ScaleSchema>;

/** 自定义 scale operation（运行时由 ScaleDefinition 精确校验并解析；type 排除内置） */
export type IRPlotCustomScale = z.infer<typeof CustomScaleSchema>;

/** scale operation（内置精确 13-union ∪ 自定义 type 开放配置） */
export type IRPlotScaleOperation = z.infer<typeof ScaleOperationSchema>;
