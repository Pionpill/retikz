import { z } from 'zod';
import { StepSchema } from './step';

export const PathSchema = z
  .object({
    type: z
      .literal('path')
      .describe('Discriminator marking this child as a path'),
    stroke: z
      .string()
      .optional()
      .describe(
        'Stroke color of the path; any CSS color. Defaults to currentColor when omitted',
      ),
    strokeWidth: z
      .number()
      .optional()
      .describe('Stroke width in user units; defaults to 1 when omitted'),
    strokeDasharray: z
      .string()
      .optional()
      .describe(
        'SVG stroke-dasharray pattern (e.g. "4 2"); leave empty for solid line',
      ),
    children: z
      .array(StepSchema)
      .min(2)
      .describe(
        'Sequence of step actions defining the path; the first should usually be a `move`',
      ),
  })
  .describe(
    'A drawn path composed of a sequence of step actions (move / line / ...)',
  );

/** 路径：由若干 step 动作（move / line / ...）组成的绘制路径 */
export type IRPath = z.infer<typeof PathSchema>;
