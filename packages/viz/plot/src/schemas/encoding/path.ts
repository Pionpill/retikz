import { NonBlankStringSchema } from '@retikz/foundation';
import { array, union } from 'zod';

import { ChannelSchema } from './channel';
import { PathLabelEncodingSchema } from './label';
import { VisualEncodingSchema } from './visual';

/** 路径标签的字段名简写等价于同一标签索引的 content 绑定 */
const pathLabelEncoding = union([NonBlankStringSchema, PathLabelEncodingSchema]);

/** 校验路径宿主的外观与标签字段编码；不包含顶点、端点、分组或排序规则 */
export const PathEncodingSchema = VisualEncodingSchema.extend({
  rotate: ChannelSchema.optional(),
  scale: ChannelSchema.optional(),
  fillRule: ChannelSchema.optional(),
  dashPattern: ChannelSchema.optional(),
  lineCap: ChannelSchema.optional(),
  lineJoin: ChannelSchema.optional(),
  cornerRadius: ChannelSchema.optional(),
  /** 单标签或非空多标签数组；字符串表示内容字段，各项与固定标签按索引配对 */
  label: union([pathLabelEncoding, array(pathLabelEncoding).min(1)]).optional(),
}).describe('Declared path-host visual field targets');
