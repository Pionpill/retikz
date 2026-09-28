import { ChildSchema, NodeLabelSchema, NodeSchema, ScopePropsSchema, Side } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { SurfaceSchema } from '@retikz/standard/presentation';
import { array, enum as zodEnum, literal, strictObject } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphDefaultsSchema, GraphRuleSchema } from '../theme';

/** Group caption 文本可复用的 Core Node 文字字段 */
export const GroupCaptionTextSchema = strictObject({
  text: NodeSchema.shape.text.unwrap().describe('Required Core Node text content for this caption item.'),
  align: NodeSchema.shape.layout.unwrap().shape.align.describe('Text alignment within the caption item.'),
  lineHeight: NodeSchema.shape.layout.unwrap().shape.lineHeight.describe('Text line height.'),
  maxTextWidth: NodeSchema.shape.layout.unwrap().shape.maxTextWidth.describe('Maximum text width before wrapping.'),
  textColor: NodeSchema.shape.style.unwrap().shape.textColor.describe('Local text color override.'),
  font: NodeSchema.shape.style.unwrap().shape.font.describe('Local font configuration.'),
  opacity: NodeSchema.shape.style.unwrap().shape.opacity.describe('Text opacity.'),
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
  side: GroupCaptionSideSchema.optional().describe('Caption side relative to the body; defaults to top.'),
  direction: GroupCaptionDirectionSchema.optional().describe(
    'Title and description direction; defaults to horizontal.',
  ),
  itemGap: NonNegativeNumberSchema.optional().describe('Gap between title and description in user units.'),
  bodyGap: NonNegativeNumberSchema.optional().describe('Gap between a non-empty body and the caption in user units.'),
  title: GroupCaptionTextSchema.optional().describe('Optional primary caption title.'),
  description: GroupCaptionTextSchema.optional().describe('Optional secondary caption description.'),
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
  graphDefaults: GraphDefaultsSchema.optional().describe('Optional sparse Graph defaults for visible descendants.'),
  graphRules: array(GraphRuleSchema).optional().describe('Optional ordered Graph rules for visible descendants.'),
  caption: GroupCaptionSchema.optional().describe('Structured caption placed inside the shell.'),
  labels: array(NodeLabelSchema)
    .nonempty()
    .optional()
    .describe('Non-empty Core Node labels attached to the Group boundary.'),
  padding: SurfaceSchema.shape.padding
    .unwrap()
    .optional()
    .describe('Spacing around the caption and body; compilation defaults to 10.'),
  background: SurfaceSchema.shape.background.describe('Explicit shell background override.'),
  border: SurfaceSchema.shape.border.describe('Explicit shell border; replaces the entire theme border field.'),
  cornerRadius: SurfaceSchema.shape.cornerRadius.unwrap().optional().describe('Shell corner radius.'),
  overflow: SurfaceSchema.shape.overflow
    .unwrap()
    .optional()
    .describe('Surface content overflow; does not clip boundary labels.'),
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
}).describe('JSON-safe Graph Group combining Scope, Surface, caption, boundary labels and arbitrary children.');
