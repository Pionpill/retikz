import { NonNegativeNumberSchema, NormalizedFractionSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { DrawableInstanceSchema, DrawableStyleSchema } from '../../drawable';
import { JsonObjectSchema } from '../../json';
import { AngleDegreesSchema } from '../../scalar';
import { PathLineCapSchema, PathLineJoinSchema, StrokeStyleSchema } from '../../stroke';
import { ArrowEndDetailSchema } from '../arrow';
import { PathRibbonOptionsSchema } from '../ribbon';
import { GeometryLabelSchema, StepSchema } from '../step';
import { PathFillRule, PathKind } from './constants';

export const PathFillRuleSchema = z.enum(PathFillRule).describe('Path fill rule keyword.');

export const PathAnisotropicScaleSchema = z
  .object({
    x: PositiveNumberSchema.describe('Scale factor on the x axis.'),
    y: PositiveNumberSchema.describe('Scale factor on the y axis.'),
  })
  .strict()
  .describe('Anisotropic scale with independent x / y factors.');

export const PathScaleSchema = z
  .union([PositiveNumberSchema, PathAnisotropicScaleSchema])
  .describe(
    'Whole-path scale: a single number for uniform scaling, or an { x, y } object for anisotropic scaling. Applied around the path bounding-box center with rotate.',
  );

export const PathStrokeSchema = z
  .strictObject({
    ...StrokeStyleSchema.shape,
    lineCap: PathLineCapSchema.optional().describe(
      'Stroke endpoint shape. Omitted fields use butt; round adds a half-disc cap and square extends past the endpoint.',
    ),
    lineJoin: PathLineJoinSchema.optional().describe(
      'Stroke corner shape. Omitted fields use miter; round rounds the join and bevel cuts the corner flat.',
    ),
  })
  .describe('Path stroke fields combining shared stroke style with path endpoint and join options.');

export const ArrowMarkSchema = ArrowEndDetailSchema.extend({
  kind: z.literal('arrow').describe('Discriminator marking this mark as an arrow tip.'),
})
  .strict()
  .describe(
    'Arrow mark placed along the path. Direction follows the path tangent; `shape` is an arrow provider name, not a direction token.',
  );

export const PathMarkPlacementSchema = z
  .object({
    pos: NormalizedFractionSchema.describe(
      'Normalized position along the path. Parameter meaning matches step labels: arc length for line-like steps and Bezier parameter for curve-like steps.',
    ),
    mark: ArrowMarkSchema.describe(
      'The mark to place at this position; currently an arrow tip oriented by the path tangent.',
    ),
  })
  .strict()
  .describe('One mark placement along the path.');

export const PathFillSchema = z
  .strictObject({
    fillRule: PathFillRuleSchema.optional().describe(
      'How self-intersecting / nested sub-paths are filled. `nonzero` (default) winds-by-direction; `evenodd` toggles fill on each crossing — useful for ring / donut shapes.',
    ),
  })
  .describe('Path fill fields controlling the fill winding rule.');

export const PathGeometrySchema = z
  .strictObject({
    roundedCorners: NonNegativeNumberSchema.optional().describe(
      'Geometric corner radius applied to line-to-line joints. Distinct from `lineJoin`, which only styles stroke corners. Omitted fields keep sharp joints.',
    ),
    rotate: AngleDegreesSchema.optional().describe(
      'Rotate the whole path around its bounding-box center. Endpoints resolve before rotation wraps the resulting geometry.',
    ),
    scale: PathScaleSchema.optional().describe(
      'Scale the whole path around its bounding-box center. Applied with rotate around the same center.',
    ),
    children: z
      .array(StepSchema)
      .min(2)
      .optional()
      .describe('Sequence of step actions defining the path; the first should usually be a `move`'),
  })
  .describe('Path geometry fields describing transforms, corner treatment, and step children.');

export const PathDecorationSchema = z
  .strictObject({
    label: z
      .union([GeometryLabelSchema, z.array(GeometryLabelSchema).min(1)])
      .optional()
      .describe('Host label attached to this path-like relation.'),
    marks: z
      .array(PathMarkPlacementSchema)
      .optional()
      .describe('Marks placed along the path at normalized positions; direction follows the path tangent.'),
  })
  .describe('Path decoration fields for host labels and along-path marks.');

export const PathStructureSchema = z
  .strictObject({
    type: z.literal('path').describe('Discriminator marking this child as a path.'),
    kind: z.string().min(1).optional().describe('Path kind provider name. Omitted means built-in `stroke`.'),
    kindOptions: JsonObjectSchema.optional().describe(
      'JSON-safe option object for custom path kind providers. Built-in `stroke` and `ribbon` do not use this field.',
    ),
    ribbon: PathRibbonOptionsSchema.optional().describe('Ribbon-specific options. Valid only when kind is `ribbon`.'),
  })
  .describe('Path structure fields selecting the kind provider and ribbon options.');

export const PathBaseSchema = z
  .strictObject({
    ...PathStructureSchema.shape,
    ...DrawableInstanceSchema.shape,
    ...DrawableStyleSchema.shape,
    ...PathStrokeSchema.shape,
    ...PathFillSchema.shape,
    ...PathGeometrySchema.shape,
    ...PathDecorationSchema.shape,
  })
  .describe('Base fields for a path-like relation before kind-specific structural refinement.');

export const PathSchema = PathBaseSchema.superRefine((path, ctx) => {
  const kind = path.kind ?? PathKind.Stroke;
  if (kind === PathKind.Stroke) {
    if (path.children === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['children'],
        message: 'Stroke paths require `children` steps.',
      });
    }
    if (path.ribbon !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['ribbon'],
        message: '`ribbon` options are only valid when `kind` is `ribbon`.',
      });
    }
    if (path.kindOptions !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['kindOptions'],
        message: '`kindOptions` is only valid for custom path kinds.',
      });
    }
    return;
  }
  if (kind === PathKind.Ribbon) {
    if (path.ribbon === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['ribbon'],
        message: 'Ribbon paths require a `ribbon` options object.',
      });
    }
    if (path.kindOptions !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['kindOptions'],
        message: '`kindOptions` is only valid for custom path kinds.',
      });
    }
    if (path.ribbon?.mode === 'boundary') {
      if (path.children !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['children'],
          message: 'Boundary ribbon paths use `ribbon.upper` and `ribbon.lower`, not top-level `children`.',
        });
      }
    } else if (path.children === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['children'],
        message: 'Centerline ribbon paths require top-level `children` steps.',
      });
    }
    return;
  }
  if (path.ribbon !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['ribbon'],
      message: '`ribbon` options are only valid when `kind` is `ribbon`.',
    });
  }
}).describe('A drawn path composed of a sequence of step actions (move / line / ...)');
