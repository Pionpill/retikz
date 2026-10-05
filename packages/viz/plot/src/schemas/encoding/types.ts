import type { infer as ZodInfer } from 'zod';

import type {
  ChannelSchema,
  EncodingSchema,
  MarkChannelEncodingSchema,
  MarkGeometryLabelListSchema,
  MarkGeometryLabelSchema,
  MarkLabelContentSchema,
  MarkLabelSchema,
  MarkNodeLabelListSchema,
  MarkNodeLabelSchema,
  OpacityChannelSchema,
  PointEncodingSchema,
  PositionEncodingSchema,
  ShapeChannelSchema,
  SizeChannelSchema,
  TextChannelSchema,
} from './schema';

/** 通道绑定，在数据字段 field 与常量 value 中恰好选择一种 */
export type IRPlotChannel = ZodInfer<typeof ChannelSchema>;

/** 位置通道绑定；内置坐标系使用 x、y、z，自定义坐标系可扩展角色键 */
export type IRPlotPositionEncoding = ZodInfer<typeof PositionEncodingSchema>;

/** 标记的非位置通道绑定 */
export type IRPlotMarkChannelEncoding = ZodInfer<typeof MarkChannelEncodingSchema>;

/** 标记的位置通道与共享通道绑定 */
export type IRPlotEncoding = ZodInfer<typeof EncodingSchema>;

/** 尺寸通道辅助 schema 的推导类型；PointMark 的规范尺寸由样式字段 schema 定义 */
export type IRPlotSizeChannel = ZodInfer<typeof SizeChannelSchema>;

/** 透明度通道辅助 schema 的推导类型；PointMark 的规范透明度由样式字段 schema 定义 */
export type IRPlotOpacityChannel = ZodInfer<typeof OpacityChannelSchema>;

/** 形状通道辅助 schema 的推导类型；PointMark 的规范形状由样式字段 schema 定义 */
export type IRPlotShapeChannel = ZodInfer<typeof ShapeChannelSchema>;

/** 点标记编码，仅包含位置通道与可选文本通道 */
export type IRPlotPointEncoding = ZodInfer<typeof PointEncodingSchema>;

/** 文本内容的通道绑定 */
export type IRPlotTextChannel = ZodInfer<typeof TextChannelSchema>;

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
