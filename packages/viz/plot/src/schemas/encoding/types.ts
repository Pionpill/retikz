import type { infer as ZodInfer } from 'zod';

import type {
  ChannelSchema,
  LabelEncodingSchema,
  Position1DEncodingSchema,
  Position2DEncodingSchema,
  Position3DEncodingSchema,
  PositionEncodingSchema,
  PositionInputSchema,
  VisualEncodingSchema,
} from './schema';

/** 字段名简写或显式 field/scale 绑定 */
export type IRPlotChannel = ZodInfer<typeof ChannelSchema>;

/** 字段、数据空间常量或最终范围边缘的位置输入 */
export type IRPlotPositionInput = ZodInfer<typeof PositionInputSchema>;

/** 一维位置编码，x 必填，不允许提供 y、z */
export type IRPlotPosition1DEncoding = ZodInfer<typeof Position1DEncodingSchema>;

/** 二维位置编码，x、y 必填，不允许提供 z */
export type IRPlotPosition2DEncoding = ZodInfer<typeof Position2DEncodingSchema>;

/** 三维位置编码，x、y、z 均必填 */
export type IRPlotPosition3DEncoding = ZodInfer<typeof Position3DEncodingSchema>;

/** 从 x 开始连续提供坐标角色的一至三维位置绑定 */
export type IRPlotPositionEncoding = ZodInfer<typeof PositionEncodingSchema>;

/** 共享绘图外观的字段编码 */
export type IRPlotVisualEncoding = ZodInfer<typeof VisualEncodingSchema>;

/** 单个标签的共同字段编码；不包含字符串简写和宿主专属附着字段 */
export type IRPlotLabelEncoding = ZodInfer<typeof LabelEncodingSchema>;
