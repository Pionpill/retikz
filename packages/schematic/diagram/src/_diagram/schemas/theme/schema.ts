import { strictObject } from 'zod';

import { DiagramFrameBaseSchema } from '../frame';
import { DiagramPresentationTextSchema } from '../presentation';

/** Diagram defaults 中可主题化的 Frame 字段 */
export const DiagramDefaultsFrameSchema = DiagramFrameBaseSchema.pick({
  padding: true,
  titleDescriptionGap: true,
  headingMainGap: true,
  drawingLegendGap: true,
  background: true,
  border: true,
  cornerRadius: true,
}).describe('Sparse Diagram frame defaults without Legend placement or overflow.');

/** Diagram defaults 中的块级文本格式字段 */
export const DiagramDefaultsPresentationTextSchema = DiagramPresentationTextSchema.omit({ text: true }).describe(
  'Sparse Diagram presentation text defaults without content.',
);

/** Diagram defaults 中的 Presentation 区域字段 */
export const DiagramDefaultsPresentationSchema = strictObject({
  title: DiagramDefaultsPresentationTextSchema.optional().describe('Optional title text defaults.'),
  description: DiagramDefaultsPresentationTextSchema.optional().describe('Optional description text defaults.'),
}).describe('Sparse Diagram presentation defaults without region content.');

/** Diagram 的 Source-derived 稀疏默认片段 */
export const DiagramDefaultsSchema = strictObject({
  frame: DiagramDefaultsFrameSchema.optional().describe('Optional Diagram frame defaults.'),
  presentation: DiagramDefaultsPresentationSchema.optional().describe('Optional Diagram presentation defaults.'),
}).describe('Sparse Diagram defaults using the formal Presentation and Frame Source paths.');
