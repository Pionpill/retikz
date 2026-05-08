import { z } from 'zod';
import { ARROW_SHAPES } from './arrow';
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
    arrow: z
      .enum(['none', '->', '<-', '<->'])
      .optional()
      .describe(
        'Path-level arrow direction. omitted/`none` = no arrows; `->` = arrow at end; `<-` = at start; `<->` = both.',
      ),
    arrowShape: z
      .nativeEnum(ARROW_SHAPES)
      .optional()
      .describe(
        'Arrow tip shape; default `normal` (filled triangle). Other values: `open` (hollow triangle), `stealth` (sharp barb), `diamond`, `circle`.',
      ),
    fill: z
      .string()
      .optional()
      .describe(
        'Fill color of the closed region; any CSS color. Omitted = no fill (stroke only). Pairs with `cycle` step for filled shapes.',
      ),
    fillRule: z
      .enum(['nonzero', 'evenodd'])
      .optional()
      .describe(
        'How self-intersecting / nested sub-paths are filled. `nonzero` (default, SVG default) winds-by-direction; `evenodd` toggles fill on each crossing — useful for ring / donut shapes.',
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
