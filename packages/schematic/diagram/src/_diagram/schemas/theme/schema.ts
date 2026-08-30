import { NodeSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { SurfaceInputSchema } from '@retikz/standard';
import { strictObject } from 'zod';

import { hasOwnFields, withDiagramSourceInput } from '../refinements';

const DiagramThemeFrameSchema = strictObject({
  padding: SurfaceInputSchema.shape.padding.describe('Default Standard Surface padding for the complete Diagram.'),
  titleDescriptionGap: NonNegativeNumberSchema.optional().describe('Default title-to-description physical gap.'),
  headingMainGap: NonNegativeNumberSchema.optional().describe('Default heading-to-main physical gap.'),
  drawingLegendGap: NonNegativeNumberSchema.optional().describe('Default drawing-to-Legend physical gap.'),
  background: SurfaceInputSchema.shape.background.describe('Default Standard Surface background.'),
  border: SurfaceInputSchema.shape.border.describe('Default Standard Surface border.'),
  cornerRadius: SurfaceInputSchema.shape.cornerRadius.describe('Default Standard Surface corner radius.'),
})
  .refine(hasOwnFields, { message: 'Diagram theme frame slice must contain at least one field.' })
  .describe('Sparse Diagram frame appearance and spacing defaults.');

const DiagramTextAppearanceSchema = strictObject({
  textColor: NodeSchema.shape.textColor.describe('Block-level presentation text color.'),
  opacity: NodeSchema.shape.opacity.describe('Block-level presentation opacity.'),
  font: NodeSchema.shape.font.describe('Block-level presentation font overrides.'),
  align: NodeSchema.shape.align.describe('Block-level presentation text alignment.'),
  lineHeight: NodeSchema.shape.lineHeight.describe('Block-level presentation line height.'),
  maxTextWidth: NodeSchema.shape.maxTextWidth.describe('Block-level presentation wrapping width.'),
})
  .refine(hasOwnFields, { message: 'Diagram text appearance slice must contain at least one field.' })
  .describe('Sparse block-level appearance for one Diagram presentation text region.');

/** Diagram Theme 持久化片段 schema */
export const DiagramThemeSchema = withDiagramSourceInput(
  strictObject({
    frame: DiagramThemeFrameSchema.optional().describe('Optional Diagram frame appearance defaults.'),
    title: DiagramTextAppearanceSchema.optional().describe('Optional title block appearance defaults.'),
    description: DiagramTextAppearanceSchema.optional().describe('Optional description block appearance defaults.'),
  })
    .refine(hasOwnFields, { message: 'Diagram theme must contain at least one non-empty slice.' })
    .describe('Sparse Diagram-owned appearance defaults shared by concrete Diagram types.'),
  'Diagram theme',
);
