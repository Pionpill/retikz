import { z } from 'zod';

export const BoxPaddingSchema = z
  .strictObject({
    top: z.number().nonnegative().optional().describe('Top padding in user units'),
    right: z.number().nonnegative().optional().describe('Right padding in user units'),
    bottom: z.number().nonnegative().optional().describe('Bottom padding in user units'),
    left: z.number().nonnegative().optional().describe('Left padding in user units'),
  })
  .describe('Optional per-side padding around a plot composition frame');
