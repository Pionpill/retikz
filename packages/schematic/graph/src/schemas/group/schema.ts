import { ChildSchema, NodeLabelSchema, NodeSchema, ScopePropsSchema, Side } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { SurfaceInputSchema } from '@retikz/standard';
import { array, enum as zodEnum, literal, strictObject } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphThemeLayerSchema } from '../theme';

/** Group caption 文本可复用的 Core Node 文字字段 */
export const GroupCaptionTextSchema = strictObject({
  text: NodeSchema.shape.text.unwrap().describe('Required Core Node text content for this caption item.'),
  align: NodeSchema.shape.align,
  lineHeight: NodeSchema.shape.lineHeight,
  maxTextWidth: NodeSchema.shape.maxTextWidth,
  textColor: NodeSchema.shape.textColor,
  font: NodeSchema.shape.font,
  opacity: NodeSchema.shape.opacity,
}).describe('A Group caption text item composed only from the Core Node text surface.');

/** Group caption 的上下位置 */
export const GroupCaptionSideSchema = zodEnum([Side.Top, Side.Bottom]).describe(
  'Whether the caption is arranged above or below the Group body.',
);

/** Group caption 内 title 与 description 的排列方向 */
export const GroupCaptionDirectionSchema = zodEnum(['horizontal', 'vertical']).describe(
  'Physical direction used to arrange caption title and description.',
);

/** Group 外框内的结构化说明区 */
export const GroupCaptionSchema = strictObject({
  side: GroupCaptionSideSchema.optional(),
  direction: GroupCaptionDirectionSchema.optional(),
  itemGap: NonNegativeNumberSchema.optional().describe('Gap between title and description in user units.'),
  bodyGap: NonNegativeNumberSchema.optional().describe('Gap between a non-empty body and the caption in user units.'),
  title: GroupCaptionTextSchema.optional(),
  description: GroupCaptionTextSchema.optional(),
})
  .refine(caption => caption.title !== undefined || caption.description !== undefined, {
    message: 'Group caption requires title or description.',
  })
  .describe('Optional structured caption placed inside the Group Surface.');

/** JSON-safe Group semantic composite */
export const GroupSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Group).describe('Group Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  graphTheme: GraphThemeLayerSchema.optional().describe('Optional Graph-local appearance rule layer.'),
  caption: GroupCaptionSchema.optional(),
  labels: array(NodeLabelSchema)
    .nonempty()
    .optional()
    .describe('Non-empty Core Node labels attached to the Group boundary.'),
  padding: SurfaceInputSchema.shape.padding,
  background: SurfaceInputSchema.shape.background,
  border: SurfaceInputSchema.shape.border,
  cornerRadius: SurfaceInputSchema.shape.cornerRadius,
  overflow: SurfaceInputSchema.shape.overflow,
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
}).describe('JSON-safe Graph Group combining Scope, Surface, caption, boundary labels and arbitrary children.');
