import type { z } from 'zod';

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

/** 分类标量：类别取值 */
export type CategoryValue = z.infer<typeof CategoryValueSchema>;

/** 线性 scale */
export type LinearScale = z.infer<typeof LinearScaleSchema>;

/** band scale */
export type BandScale = z.infer<typeof BandScaleSchema>;

/** point scale */
export type PointScale = z.infer<typeof PointScaleSchema>;

/** ordinal scale（分类 → 离散输出，颜色） */
export type OrdinalScale = z.infer<typeof OrdinalScaleSchema>;

/** time scale（连续时间，epoch ms） */
export type TimeScale = z.infer<typeof TimeScaleSchema>;

/** log scale（连续对数，domain 全正） */
export type LogScale = z.infer<typeof LogScaleSchema>;

/** pow scale（连续幂） */
export type PowScale = z.infer<typeof PowScaleSchema>;

/** sqrt scale（连续平方根，面积感知；size 通道默认派生目标） */
export type SqrtScale = z.infer<typeof SqrtScaleSchema>;

/** symlog scale（对称对数，近零线性、尾部对数；跨零 / 含负的宽幅数据） */
export type SymlogScale = z.infer<typeof SymlogScaleSchema>;

/** radial scale（径向，面积感知半径；极坐标 / 玫瑰图值轴） */
export type RadialScale = z.infer<typeof RadialScaleSchema>;

/** sequential color scale（连续顺序色阶；continuous / temporal color 主力） */
export type SequentialColorScale = z.infer<typeof SequentialColorScaleSchema>;

/** diverging color scale（连续发散色阶；有中点的量两侧异色） */
export type DivergingColorScale = z.infer<typeof DivergingColorScaleSchema>;

/** quantize color scale（等宽离散化；连续 domain 等宽切档 → 离散色） */
export type QuantizeColorScale = z.infer<typeof QuantizeColorScaleSchema>;

/** threshold color scale（阈值离散化；自定义升序断点切档 → 离散色） */
export type ThresholdColorScale = z.infer<typeof ThresholdColorScaleSchema>;

/** quantile color scale（分位离散化；按数据分位切档 → 离散色，无显式数值 domain） */
export type QuantileColorScale = z.infer<typeof QuantileColorScaleSchema>;

/** scale（linear / band / point / ordinal / time / log / pow / sqrt / symlog / radial / sequential / diverging / quantize / threshold / quantile） */
export type Scale = z.infer<typeof ScaleSchema>;

/** 自定义 scale operation（运行时由 ScaleDefinition 精确校验并解析；type 排除内置） */
export type CustomScale = z.infer<typeof CustomScaleSchema>;

/** scale operation（内置精确 13-union ∪ 自定义 type 开放配置） */
export type ScaleOperation = z.infer<typeof ScaleOperationSchema>;
