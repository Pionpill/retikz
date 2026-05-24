import { z } from 'zod';
import { PaintSpecSchema } from '../paint';
import { ArrowDetailSchema, ArrowEndDetailSchema } from './arrow';
import { StepSchema } from './step';

/**
 * 路径整条缩放 schema：等比 number 或非等比 {x,y}
 * @description 与 Node scale 字段对齐；number = 等比，{x,y} = 各轴独立。全部要求有限正数。
 */
export const PathScaleSchema = z
  .union([
    z.number().finite().positive(),
    z
      .object({
        x: z
          .number()
          .finite()
          .positive()
          .describe('Scale factor on the x axis (finite, positive).'),
        y: z
          .number()
          .finite()
          .positive()
          .describe('Scale factor on the y axis (finite, positive).'),
      })
      .describe('Anisotropic scale with independent x / y factors.'),
  ])
  .describe(
    'Whole-path scale: a single finite positive number for uniform scaling, or an { x, y } object for anisotropic scaling. Applied around the path bounding-box center together with rotate.',
  );

/** 路径整条缩放类型：number（等比）或 {x,y}（非等比） */
export type IRPathScale = z.infer<typeof PathScaleSchema>;

/**
 * 路径中段标记 schema（首批仅箭头）
 * @description `kind:'arrow'` 判别符 + 复用 ArrowEndDetail 视觉子集（shape / scale / length / width / color / fill / opacity / lineWidth）；
 *   方向由该处路径切线决定，shape 是已注册箭头名（不是 `->` 方向记号）。后续可扩展更多 mark kind。
 */
export const ArrowMarkSchema = ArrowEndDetailSchema.extend({
  kind: z
    .literal('arrow')
    .describe(
      'Discriminator marking this mark as an arrow tip. Only `arrow` is supported in the first batch; other kinds are rejected by schema.',
    ),
}).describe(
  'Arrow mark placed along the path: an arrow tip whose direction follows the path tangent at the mark position. Reuses the per-end arrow visual subset (shape / scale / length / width / color / fill / opacity / lineWidth); `shape` is a registered arrow name, NOT a `->` direction token.',
);

/** 路径中段箭头标记类型 */
export type IRArrowMark = z.infer<typeof ArrowMarkSchema>;

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
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Fill of the closed region: any CSS color string, or a PaintSpec (linear / radial gradient, pattern, or image). Omitted = no fill (stroke only). Pairs with `cycle` step for filled shapes.',
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
    zIndex: z
      .number()
      .int()
      .finite()
      .optional()
      .describe(
        'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable: same zIndex keeps source order. Scoped per group (a path inside a scope only restacks within that scope).',
      ),
    rotate: z
      .number()
      .finite()
      .optional()
      .describe(
        'Rotate the whole path by this many degrees about its bounding-box center (positive = visually clockwise under screen y-down). Equivalent to wrapping the path in a Scope with a rotate transform centered on the path. Endpoints are resolved in the current scope first; the rotation wraps the resulting geometry.',
      ),
    scale: PathScaleSchema.optional().describe(
      'Scale the whole path about its bounding-box center: a finite positive number (uniform) or { x, y } (anisotropic). Applied together with rotate around the same center.',
    ),
    marks: z
      .array(
        z.object({
          pos: z
            .number()
            .min(0)
            .max(1)
            .describe(
              'Normalized position along the path in [0, 1] (0 = start, 1 = end). Values outside [0, 1] are rejected by schema. The geometric meaning of the parameter matches step labels: arc length for line/step, Bezier parameter for curve/cubic/bend.',
            ),
          mark: ArrowMarkSchema.describe(
            'The mark to place at this position; currently an arrow tip oriented by the path tangent.',
          ),
        }),
      )
      .optional()
      .describe(
        'Marks placed along the path at normalized positions; each is rendered at its position with its direction taken from the path tangent there. First batch supports arrow marks only.',
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
