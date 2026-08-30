import type { IRTextBlock } from '@retikz/core';

import { TextBlockSchema } from '@retikz/core';
import { LegendSchema } from '@retikz/standard';
import { strictObject } from 'zod';

import { hasOwnFields, withDiagramSourceInput } from '../refinements';

/** TextBlock 是否至少包含一个长度大于零的 authored text 或 TeX run */
const hasAuthoredText = (block: IRTextBlock): boolean => {
  if (typeof block === 'string') return block.length > 0;
  return block.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if ('text' in line) return line.text.length > 0;
    return line.runs.some(run => ('text' in run ? run.text.length > 0 : run.tex.length > 0));
  });
};

const DiagramPresentationTextSchema = TextBlockSchema.refine(hasAuthoredText, {
  message: 'Diagram presentation text must contain at least one non-empty text or TeX run.',
});

/** Diagram Presentation 持久化片段 schema */
export const DiagramPresentationSchema = withDiagramSourceInput(
  strictObject({
    title: DiagramPresentationTextSchema.optional().describe('Optional complete Core TextBlock used as the title.'),
    description: DiagramPresentationTextSchema.optional().describe(
      'Optional complete Core TextBlock used as the description.',
    ),
    legend: LegendSchema.optional().describe('Optional explicit Standard Legend shown beside the drawing core.'),
  })
    .refine(hasOwnFields, { message: 'Diagram presentation must contain at least one region.' })
    .describe('Diagram presentation regions outside a concrete drawing core.'),
  'Diagram presentation',
);
