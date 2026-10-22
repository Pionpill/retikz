import { NonBlankStringSchema } from '@retikz/foundation';
import { array, union } from 'zod';

import { ChannelSchema } from './channel';
import { NodeLabelEncodingSchema } from './label';
import { VisualEncodingSchema } from './visual';

/** 节点标签的字段名简写等价于同一标签索引的 content 绑定 */
const nodeLabelEncoding = union([NonBlankStringSchema, NodeLabelEncodingSchema]);

/** 校验节点宿主的外观与标签字段编码；具体图元另行组合位置和构造规则 */
export const NodeEncodingSchema = VisualEncodingSchema.extend({
  align: ChannelSchema.optional(),
  lineHeight: ChannelSchema.optional(),
  maxTextWidth: ChannelSchema.optional(),
  cornerRadius: ChannelSchema.optional(),
  scale: ChannelSchema.optional(),
  padding: ChannelSchema.optional(),
  margin: ChannelSchema.optional(),
  dashed: ChannelSchema.optional(),
  dotted: ChannelSchema.optional(),
  dashPattern: ChannelSchema.optional(),
  font: ChannelSchema.optional(),
  boundary: ChannelSchema.optional(),
  /** 单标签或非空多标签数组；字符串表示内容字段，各项与固定标签按索引配对 */
  label: union([nodeLabelEncoding, array(nodeLabelEncoding).min(1)]).optional(),
}).describe('Declared node-host visual field targets');
