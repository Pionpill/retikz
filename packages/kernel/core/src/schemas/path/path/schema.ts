import { z } from 'zod';

import { DrawableMetaSchema, DrawableStyleSchema } from '../../drawable';
import { JsonObjectSchema } from '../../json';
import { ArrowDetailSchema, ArrowEndDetailSchema } from '../arrow';
import { PathRibbonOptionsSchema } from '../ribbon';
import { GeometryLabelSchema } from '../step';
import { StepSchema } from '../step';

/**
 * 路径整条缩放 schema：等比 number 或非等比 {x,y}
 * @description 与 Node scale 字段对齐；number = 等比，{x,y} = 各轴独立。全部要求有限正数。
 */
export const PathScaleSchema = z
  .union([
    z.number().positive(),
    z
      .object({
        x: z
          .number()

          .positive()
          .describe('Scale factor on the x axis.'),
        y: z
          .number()

          .positive()
          .describe('Scale factor on the y axis.'),
      })
      .describe('Anisotropic scale with independent x / y factors.'),
  ])
  .describe(
    'Whole-path scale: a single number for uniform scaling, or an { x, y } object for anisotropic scaling. Applied around the path bounding-box center with rotate.',
  );

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
  'Arrow mark placed along the path. Direction follows the path tangent; `shape` is an arrow provider name, not a direction token.',
);

export const PathBaseSchema = z
  .object({
    type: z.literal('path').describe('Discriminator marking this child as a path.'),
    kind: z.string().min(1).optional().describe('Path kind provider name. Omitted means built-in `stroke`.'),
    kindOptions: JsonObjectSchema.optional().describe(
      'JSON-safe option object for custom path kind providers. Built-in `stroke` and `ribbon` do not use this field.',
    ),
    ribbon: PathRibbonOptionsSchema.optional().describe('Ribbon-specific options. Valid only when kind is `ribbon`.'),
    label: z
      .union([GeometryLabelSchema, z.array(GeometryLabelSchema).min(1)])
      .optional()
      .describe('Host label attached to this path-like relation.'),
    ...DrawableMetaSchema.shape,
    ...DrawableStyleSchema.shape,
    dashPattern: z
      .array(z.number().nonnegative())
      .min(1)
      .optional()
      .describe('Stroke dash pattern lengths in user units. Omitted fields mean solid line.'),
    arrow: z
      .enum(['none', '->', '<-', '<->'])
      .optional()
      .describe(
        'Path-level arrow direction. omitted/`none` = no arrows; `->` = arrow at end; `<-` = at start; `<->` = both.',
      ),
    arrowDetail: ArrowDetailSchema.optional().describe(
      'Detailed arrow visual config with optional `start` and `end` per-end overrides. Omitted fields use arrow definition defaults.',
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
        'Stroke endpoint shape. Omitted fields use butt; round adds a half-disc cap and square extends past the endpoint.',
      ),
    lineJoin: z
      .enum(['miter', 'round', 'bevel'])
      .optional()
      .describe('Stroke corner shape. Omitted fields use miter; round rounds the join and bevel cuts the corner flat.'),
    roundedCorners: z
      .number()

      .nonnegative()
      .optional()
      .describe(
        'Geometric corner radius applied to line-to-line joints. Distinct from `lineJoin`, which only styles stroke corners. Omitted fields keep sharp joints.',
      ),
    thickness: z
      .enum(['ultraThin', 'veryThin', 'thin', 'semithick', 'thick', 'veryThick', 'ultraThick'])
      .optional()
      .describe('Semantic stroke thickness preset. Used only when `strokeWidth` is omitted.'),
    rotate: z
      .number()

      .optional()
      .describe(
        'Rotate the whole path around its bounding-box center. Endpoints resolve before rotation wraps the resulting geometry.',
      ),
    scale: PathScaleSchema.optional().describe(
      'Scale the whole path around its bounding-box center. Applied with rotate around the same center.',
    ),
    marks: z
      .array(
        z
          .object({
            pos: z
              .number()
              .min(0)
              .max(1)
              .describe(
                'Normalized position along the path. Parameter meaning matches step labels: arc length for line-like steps and Bezier parameter for curve-like steps.',
              ),
            mark: ArrowMarkSchema.describe(
              'The mark to place at this position; currently an arrow tip oriented by the path tangent.',
            ),
          })
          .describe('One mark placement along the path.'),
      )
      .optional()
      .describe(
        'Marks placed along the path at normalized positions; each is rendered at its position with its direction taken from the path tangent there. First batch supports arrow marks only.',
      ),
    children: z
      .array(StepSchema)
      .min(2)
      .optional()
      .describe('Sequence of step actions defining the path; the first should usually be a `move`'),
  })
  .strict()
  .describe('Base fields for a path-like relation before kind-specific structural refinement.');

export const PathSchema = PathBaseSchema.superRefine((path, ctx) => {
  const kind = path.kind ?? 'stroke';
  if (kind === 'stroke') {
    if (path.children === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['children'],
        message: 'Stroke paths require `children` steps.',
      });
    }
    if (path.ribbon !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ribbon'],
        message: '`ribbon` options are only valid when `kind` is `ribbon`.',
      });
    }
    if (path.kindOptions !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kindOptions'],
        message: '`kindOptions` is only valid for custom path kinds.',
      });
    }
    return;
  }
  if (kind === 'ribbon') {
    if (path.ribbon === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ribbon'],
        message: 'Ribbon paths require a `ribbon` options object.',
      });
    }
    if (path.kindOptions !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kindOptions'],
        message: '`kindOptions` is only valid for custom path kinds.',
      });
    }
    if (path.ribbon?.mode === 'boundary') {
      if (path.children !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['children'],
          message: 'Boundary ribbon paths use `ribbon.upper` and `ribbon.lower`, not top-level `children`.',
        });
      }
    } else if (path.children === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['children'],
        message: 'Centerline ribbon paths require top-level `children` steps.',
      });
    }
    return;
  }
  if (path.ribbon !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ribbon'],
      message: '`ribbon` options are only valid when `kind` is `ribbon`.',
    });
  }
}).describe('A drawn path composed of a sequence of step actions (move / line / ...)');
