import { z } from 'zod';
import { ArrowDetailSchema } from './arrow';
import { StepSchema } from './step';

export const PathSchema = z
  .object({
    type: z
      .literal('path')
      .describe('Discriminator marking this child as a path'),
    color: z
      .string()
      .optional()
      .describe(
        'Master color (TikZ `color=`). When set, the stroke, arrow tips, and step labels default to it unless individually overridden. Following the master color (not the stroke) is how a colored line shares its color with its labels and arrows — `stroke=` alone only paints the line.',
      ),
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
    dashPattern: z
      .array(z.number().finite().nonnegative())
      .min(1)
      .optional()
      .describe(
        'Stroke dash pattern lengths in user units (e.g. [4, 2]); omitted means solid line',
      ),
    arrow: z
      .enum(['none', '->', '<-', '<->'])
      .optional()
      .describe(
        'Path-level arrow direction. omitted/`none` = no arrows; `->` = arrow at end; `<-` = at start; `<->` = both.',
      ),
    arrowDetail: ArrowDetailSchema.optional().describe(
      'Detailed arrow visual config (shape / scale / length / width / color / fill / opacity / lineWidth) with optional `start` / `end` per-end overrides. Omitted = built-in defaults (shape `stealth`, all visuals inherit from path stroke / opacity).',
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
        'How self-intersecting / nested sub-paths are filled. `nonzero` (default) winds-by-direction; `evenodd` toggles fill on each crossing — useful for ring / donut shapes.',
      ),
    lineCap: z
      .enum(['butt', 'round', 'square'])
      .optional()
      .describe(
        'Stroke endpoint shape (`butt` / `round` / `square`; matches TikZ `line cap`). Default `butt` (sharp end); `round` adds a half-disc cap; `square` extends a half-stroke past the endpoint.',
      ),
    lineJoin: z
      .enum(['miter', 'round', 'bevel'])
      .optional()
      .describe(
        'Stroke corner shape (`miter` / `round` / `bevel`; matches TikZ `line join`). Default `miter` (sharp corner); `round` rounds the join; `bevel` cuts the corner flat.',
      ),
    thickness: z
      .enum([
        'ultraThin',
        'veryThin',
        'thin',
        'semithick',
        'thick',
        'veryThick',
        'ultraThick',
      ])
      .optional()
      .describe(
        'Semantic stroke thickness preset (TikZ `ultra thin` … `ultra thick`). Compiled to a numeric stroke-width if `strokeWidth` is omitted. Explicit `strokeWidth` always wins.',
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Whole-path opacity 0..1; multiplies onto stroke and fill.'),
    fillOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Fill opacity 0..1; affects only the closed-region fill.'),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        'Stroke opacity 0..1 (TikZ `draw opacity`); affects only the path stroke.',
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

/** 路径：由若干 step 动作（move/line/...）组成 */
export type IRPath = z.infer<typeof PathSchema>;
