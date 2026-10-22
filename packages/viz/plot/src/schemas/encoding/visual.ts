import type { JsonValue } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { strictObject } from 'zod';

import { ChannelSchema } from './channel';

/** 校验图元整体、填充和描边透明度的独立字段编码；标签透明度使用单个通道 */
export const OpacityEncodingSchema = strictObject({
  overall: ChannelSchema.optional(),
  fill: ChannelSchema.optional(),
  stroke: ChannelSchema.optional(),
}).describe('Independent opacity factor field encodings');

/**
 * 校验图元共享外观的字段编码，不包含位置或特定宿主的几何属性
 * @description 额外键仅在形态上接受通道绑定，是否已注册及适用于当前图元由通道解析阶段校验
 */
export const VisualEncodingSchema = strictObject({
  color: ChannelSchema.optional(),
  fill: ChannelSchema.optional(),
  stroke: ChannelSchema.optional(),
  strokeWidth: ChannelSchema.optional(),
  opacity: OpacityEncodingSchema.optional(),
  shadow: ChannelSchema.optional(),
  blendMode: ChannelSchema.optional(),
  zIndex: ChannelSchema.optional(),
})
  .catchall(ChannelSchema.transform((binding): JsonValue => binding))
  .describe('Declared shared visual field targets; additional field targets require registered channel definitions');

/** 共享绘图外观的字段编码 */
export type IRPlotVisualEncoding = ZodInfer<typeof VisualEncodingSchema>;
