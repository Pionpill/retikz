import type { infer as ZodInfer } from 'zod';

import type {
  ChannelSchema,
  EncodingSchema,
  VisualEncodingSchema,
  MarkGeometryLabelListSchema,
  MarkGeometryLabelSchema,
  MarkLabelContentSchema,
  MarkLabelSchema,
  MarkNodeLabelListSchema,
  MarkNodeLabelSchema,
  PointEncodingSchema,
  PositionEncodingSchema,
} from './schema';

/** 字段名简写或显式 field/scale 绑定 */
export type IRPlotChannel = ZodInfer<typeof ChannelSchema>;

/** 位置通道绑定；内置坐标系使用 x、y、z，自定义坐标系可扩展角色键 */
export type IRPlotPositionEncoding = ZodInfer<typeof PositionEncodingSchema>;

/** 共享绘图外观的字段编码 */
export type IRPlotVisualEncoding = ZodInfer<typeof VisualEncodingSchema>;

/** 标记的位置通道与共享通道绑定 */
export type IRPlotEncoding = ZodInfer<typeof EncodingSchema>;

/** 点标记编码，仅包含位置通道与可选文本通道 */
export type IRPlotPointEncoding = ZodInfer<typeof PointEncodingSchema>;

/** 标记标签内容的绑定 */
export type IRPlotMarkLabelContent = ZodInfer<typeof MarkLabelContentSchema>;

/** 与 Core NodeLabelSchema 对齐的宿主数据项标签配置 */
export type IRPlotMarkNodeLabel = ZodInfer<typeof MarkNodeLabelSchema>;

/** 与 Core GeometryLabelSchema 对齐的宿主几何标签配置 */
export type IRPlotMarkGeometryLabel = ZodInfer<typeof MarkGeometryLabelSchema>;

/** 单个或数组形式的节点标签声明 */
export type IRPlotMarkNodeLabelList = ZodInfer<typeof MarkNodeLabelListSchema>;

/** 单个或数组形式的几何标签声明 */
export type IRPlotMarkGeometryLabelList = ZodInfer<typeof MarkGeometryLabelListSchema>;

/** 由宿主推导的标记标签配置 */
export type IRPlotMarkLabel = ZodInfer<typeof MarkLabelSchema>;
