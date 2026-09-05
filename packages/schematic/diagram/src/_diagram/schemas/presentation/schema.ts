import { NodeSchema, TextBlockSchema } from '@retikz/core';
import { LegendSchema } from '@retikz/standard';
import { strictObject } from 'zod';

/** Diagram Presentation 文本区域的块级样式覆盖 */
export const DiagramPresentationTextStyleSchema = strictObject({
  textColor: NodeSchema.shape.style.unwrap().shape.textColor,
  font: NodeSchema.shape.style.unwrap().shape.font,
  opacity: NodeSchema.shape.style.unwrap().shape.opacity,
}).describe('Block-level style overrides for one Diagram presentation text region.');

/** Diagram Presentation 文本区域的块级布局覆盖 */
export const DiagramPresentationTextLayoutSchema = strictObject({
  align: NodeSchema.shape.layout.unwrap().shape.align,
  lineHeight: NodeSchema.shape.layout.unwrap().shape.lineHeight,
  maxTextWidth: NodeSchema.shape.layout.unwrap().shape.maxTextWidth,
}).describe('Block-level layout overrides for one Diagram presentation text region.');

/** Diagram Presentation 的带格式文本区域 */
export const DiagramPresentationTextSchema = strictObject({
  text: TextBlockSchema.describe('Required Core TextBlock used as the presentation region content.'),
  style: DiagramPresentationTextStyleSchema.optional().describe('Optional text region style overrides.'),
  layout: DiagramPresentationTextLayoutSchema.optional().describe('Optional text region layout overrides.'),
}).describe('Diagram presentation text region with content and block-level formatting.');

/** Diagram Presentation 持久化片段 schema */
export const DiagramPresentationSchema = strictObject({
  title: DiagramPresentationTextSchema.optional().describe('Optional title text region.'),
  description: DiagramPresentationTextSchema.optional().describe('Optional description text region.'),
  legend: LegendSchema.optional().describe('Optional explicit Standard Legend shown beside the drawing core.'),
})
  .refine(value => Object.keys(value).length > 0, { message: 'Diagram presentation must contain at least one region.' })
  .describe('Diagram presentation regions outside a concrete drawing core.');
