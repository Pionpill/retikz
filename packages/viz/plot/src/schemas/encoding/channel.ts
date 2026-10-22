import { NonBlankStringSchema } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { strictObject, union } from 'zod';

/**
 * 校验视觉通道的字段名简写或显式字段与比例尺绑定
 * @description 对象形式必须同时提供 field 和 scale；此处不接受常量，固定外观由 properties 声明
 */
export const ChannelSchema = union([
  NonBlankStringSchema,
  strictObject({
    field: NonBlankStringSchema.describe('Data field path in the current mark data view'),
    scale: NonBlankStringSchema.describe('Explicit named scale used by this target'),
  }),
]).describe('Field encoding: a non-blank field name, or a field and explicit scale pair');

/** 字段名简写或显式 field/scale 绑定 */
export type IRPlotChannel = ZodInfer<typeof ChannelSchema>;
