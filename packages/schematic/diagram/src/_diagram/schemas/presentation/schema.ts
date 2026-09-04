import { TextBlockSchema } from '@retikz/core';
import { LegendSchema } from '@retikz/standard';
import { strictObject } from 'zod';

/** Diagram Presentation 持久化片段 schema */
export const DiagramPresentationSchema = strictObject({
  title: TextBlockSchema.optional().describe('Optional complete Core TextBlock used as the title.'),
  description: TextBlockSchema.optional().describe('Optional complete Core TextBlock used as the description.'),
  legend: LegendSchema.optional().describe('Optional explicit Standard Legend shown beside the drawing core.'),
})
  .refine(value => Object.keys(value).length > 0, { message: 'Diagram presentation must contain at least one region.' })
  .describe('Diagram presentation regions outside a concrete drawing core.');
