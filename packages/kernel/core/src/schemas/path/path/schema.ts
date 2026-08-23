import {
  createOpenStringSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { z } from 'zod';

import { DrawableInstanceSchema, DrawableStyleSchema } from '../../drawable';
import { JsonObjectSchema } from '../../json';
import { AngleDegreesSchema } from '../../scalar';
import { PathLineCapSchema, PathLineJoinSchema, StrokeStyleSchema } from '../../stroke';
import { ArrowEndDetailSchema } from '../arrow';
import { GeometryLabelSchema, StepSchema } from '../step';
import { PathFillRule, PathKind } from './constants';

export const PathFillRuleSchema = z.enum(PathFillRule).describe('Path fill rule keyword.');

const PathKindSchema = createOpenStringSchema(PathKind);

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
    kind: PathKindSchema.optional().describe('Path kind provider name. Omitted means built-in `stroke`.'),
    kindOptions: JsonObjectSchema.optional().describe(
      'JSON-safe option object consumed by the selected path kind provider.',
    ),
  })
  .describe('Path structure fields selecting an open path kind provider.');

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

export const PathSchema = PathBaseSchema.describe(
  'A drawn path composed of a sequence of step actions (move / line / ...).',
);

/** Built-in stroke path subject schema with complete host constraints. */
export const StrokePathSchema = PathBaseSchema.extend({
  // Keep malformed step payloads on the compile-time diagnostic path. The stroke
  // emitter owns geometric validity and emits the established warning/error.
  children: z.array(z.unknown()).optional().describe('Sequence of source step actions for the stroke path.'),
})
  .superRefine((path, ctx) => {
    const kind = path.kind ?? PathKind.Stroke;
    if (kind !== PathKind.Stroke) {
      ctx.addIssue({
        code: 'custom',
        path: ['kind'],
        message: 'Stroke path schema requires kind `stroke` or an omitted kind.',
      });
      return;
    }
    if (path.children === undefined) {
      ctx.addIssue({ code: 'custom', path: ['children'], message: 'Stroke paths require `children` steps.' });
    }
    if (path.kindOptions !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['kindOptions'],
        message: '`kindOptions` is not valid for the built-in `stroke` path kind.',
      });
    }
  })
  .transform(path => path as z.infer<typeof PathBaseSchema>)
  .describe('Complete source subject schema for the built-in stroke path kind.');
