import { NonBlankStringSchema } from '@retikz/foundation';
import { array, union } from 'zod';

import { ChannelSchema } from './channel';
import { PathLabelEncodingSchema } from './label';
import { VisualEncodingSchema } from './visual';

/** 路径标签的字段名简写等价于同一标签索引的 text 绑定 */
const pathLabelEncoding = union([NonBlankStringSchema, PathLabelEncodingSchema]);

/** 校验路径宿主的外观与标签字段编码；不包含顶点、端点、分组或排序规则 */
export const PathEncodingSchema = VisualEncodingSchema.extend({
  rotate: ChannelSchema.optional(),
  scale: ChannelSchema.optional(),
  fillRule: ChannelSchema.optional(),
  dashPattern: ChannelSchema.optional(),
  dashOffset: ChannelSchema.optional(),
  lineCap: ChannelSchema.optional(),
  lineJoin: ChannelSchema.optional(),
  cornerRadius: ChannelSchema.optional(),
  label: union([pathLabelEncoding, array(pathLabelEncoding).min(1)])
    .optional()
    .describe(
      'Single label binding or non-empty array; strings bind text fields, and entries match fixed labels by index',
    ),
}).describe('Declared path-host visual field targets');
