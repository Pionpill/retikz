import { Side } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutAlignment } from '@retikz/layout';
import { SurfaceInputSchema } from '@retikz/standard';
import { enum as zodEnum, strictObject } from 'zod';

/** Diagram Frame 持久化片段 schema */
export const DiagramFrameSchema = strictObject({
  legendPosition: zodEnum(Side).optional().describe('Physical side where the explicit Legend is docked.'),
  legendAlign: zodEnum([LayoutAlignment.Start, LayoutAlignment.Center, LayoutAlignment.End])
    .optional()
    .describe('Legend alignment along the tangent axis of its docking side.'),
  titleDescriptionGap: NonNegativeNumberSchema.optional().describe(
    'Physical gap between title and description when both regions exist.',
  ),
  headingMainGap: NonNegativeNumberSchema.optional().describe(
    'Physical gap between the non-empty heading and main drawing region.',
  ),
  drawingLegendGap: NonNegativeNumberSchema.optional().describe(
    'Physical gap between the drawing core and an explicit Legend.',
  ),
  padding: SurfaceInputSchema.shape.padding.describe('Standard Surface padding input for the complete Diagram.'),
  background: SurfaceInputSchema.shape.background.describe('Standard Surface background for the complete Diagram.'),
  border: SurfaceInputSchema.shape.border.describe('Standard Surface border for the complete Diagram.'),
  cornerRadius: SurfaceInputSchema.shape.cornerRadius.describe(
    'Standard Surface corner radius for the complete Diagram.',
  ),
  overflow: SurfaceInputSchema.shape.overflow.describe('Standard Surface content overflow policy.'),
})
  .refine(value => Object.keys(value).length > 0, { message: 'Diagram frame must contain at least one field.' })
  .describe('Diagram instance-level arrangement, spacing, and Surface overrides.');
