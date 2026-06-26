import { z } from 'zod';
import { AnimationTrackSchema } from './animation';
import { BlendMode, DropShadowSchema, ShadowPreset } from './effects';
import { JsonObjectSchema } from './json';
import { PaintSpecSchema } from './paint';
import { StepSchema } from './path';
import { PolarPositionSchema, Vector2Schema } from './position';
import type { PolarPosition } from '../geometry/polar';
import type { Vector2 } from '../geometry/point';
import type { ValueOf } from '../types';

export const RibbonKind = {
  Centerline: 'centerline',
  Boundary: 'boundary',
} as const;

export type RibbonKindValue = ValueOf<typeof RibbonKind>;

export const RibbonAlignment = {
  Center: 'center',
  Left: 'left',
  Right: 'right',
} as const;

export type RibbonAlignmentValue = ValueOf<typeof RibbonAlignment>;

export const RibbonCap = {
  Butt: 'butt',
  Round: 'round',
  Square: 'square',
} as const;

export type RibbonCapValue = ValueOf<typeof RibbonCap>;

export const RibbonWidthStopSchema = z
  .object({
    offset: z
      .number()
      .finite()
      .min(0)
      .max(1)
      .describe('Normalized position along the centerline in [0, 1].'),
    value: z
      .number()
      .finite()
      .nonnegative()
      .describe('Ribbon width in user units at this stop.'),
  })
  .strict()
  .describe('One stop in a sampled ribbon width curve.');

export const RibbonWidthSchema = z
  .union([
    z.number().finite().nonnegative(),
    z
      .object({
        kind: z
          .literal('linear')
          .optional()
          .describe('Linear taper discriminator; omitted object kind also means linear.'),
        start: z
          .number()
          .finite()
          .nonnegative()
          .describe('Ribbon width in user units at offset 0.'),
        end: z
          .number()
          .finite()
          .nonnegative()
          .describe('Ribbon width in user units at offset 1.'),
        interpolation: z
          .enum(['linear', 'smooth'])
          .optional()
          .describe('Interpolation curve between start and end widths.'),
      })
      .strict()
      .describe('A two-end ribbon width rule.'),
    z
      .object({
        kind: z.literal('stops').describe('Discriminator for stop-based width rules.'),
        stops: z
          .array(RibbonWidthStopSchema)
          .min(2)
          .describe('Width stops; compile sorts them by offset before interpolation.'),
        interpolation: z
          .enum(['linear', 'smooth', 'step'])
          .optional()
          .describe('Interpolation curve between adjacent stops.'),
      })
      .strict()
      .describe('A multi-stop ribbon width rule.'),
    z
      .object({
        kind: z.literal('profile').describe('Discriminator for registered runtime profiles.'),
        name: z
          .string()
          .min(1)
          .describe('Registered ribbon width profile name from CompileOptions.ribbonWidthProfiles.'),
        params: JsonObjectSchema.optional().describe('JSON-safe profile parameters.'),
      })
      .strict()
      .describe('A runtime-registered width profile reference.'),
  ])
  .describe(
    'Ribbon width rule: fixed number, linear/taper object, stop curve, or registered profile reference.',
  );

export type IRRibbonDirection = number | Vector2 | PolarPosition;

export const RibbonDirectionSchema: z.ZodType<IRRibbonDirection> = z
  .union([
    z.number().finite().describe('Direction angle in degrees, where 0 points to the positive x axis.'),
    Vector2Schema.refine(([x, y]) => x !== 0 || y !== 0, {
        message: 'Ribbon direction vector must not be zero length.',
      })
      .describe('Direction vector [x, y]; Position tuples share the same shape and are treated as vectors from the origin.'),
    PolarPositionSchema.describe('PolarPosition sugar converted to a vector before normalization.'),
  ])
  .describe('Endpoint tangent direction override as an angle, Vector2/Position tuple, or PolarPosition sugar.');

export const RibbonSamplingSchema = z
  .union([
    z
      .object({
        kind: z.literal('fixed').describe('Use a fixed number of cross-section samples.'),
        samples: z
          .number()
          .int()
          .min(2)
          .max(512)
          .describe('Number of cross-section samples used to approximate the ribbon polygon.'),
      })
      .strict()
      .describe('Fixed ribbon sampling strategy.'),
    z
      .object({
        kind: z.literal('adaptive').describe('Choose a sample count from path length and tolerance.'),
        tolerance: z
          .number()
          .finite()
          .positive()
          .describe('Approximate target segment length in user units.'),
        maxSamples: z
          .number()
          .int()
          .min(2)
          .max(512)
          .optional()
          .describe('Optional upper bound for generated samples.'),
      })
      .strict()
      .describe('Length-aware adaptive ribbon sampling strategy.'),
  ])
  .describe('Ribbon boundary sampling strategy; `samples` is retained as a shorthand for fixed sampling.');

const RibbonSharedSchema = z.object({
  type: z
    .literal('ribbon')
    .describe('Discriminator marking this child as a variable-width ribbon.'),
  kind: z
    .enum(RibbonKind)
    .optional()
    .describe('Ribbon construction mode; omitted means centerline.'),
  id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional stable id used as the hydration hook on the emitted primitive.'),
  meta: JsonObjectSchema.optional().describe(
    'Opaque provenance metadata preserved verbatim into emitted Scene primitives.',
  ),
  animations: z
    .array(AnimationTrackSchema)
    .optional()
    .describe('Declarative animation tracks carried into the emitted Scene primitive.'),
  color: z
    .string()
    .optional()
    .describe('Master color; when fill is omitted, the ribbon fill follows this color.'),
  fill: z
    .union([z.string(), PaintSpecSchema])
    .optional()
    .describe(
      'Fill paint of the ribbon polygon; omitted means currentColor after style resolution.',
    ),
  fillOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Fill opacity 0..1; affects only the ribbon fill.'),
  stroke: z
    .union([z.string(), PaintSpecSchema])
    .optional()
    .describe('Optional outline stroke paint for the ribbon polygon.'),
  strokeWidth: z
    .number()
    .finite()
    .nonnegative()
    .optional()
    .describe('Optional outline stroke width in user units.'),
  drawOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Outline stroke opacity 0..1.'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Whole-ribbon opacity 0..1.'),
  shadow: z
    .union([z.enum(ShadowPreset), DropShadowSchema])
    .optional()
    .describe('Drop shadow on the emitted ribbon polygon.'),
  blendMode: z
    .enum(BlendMode)
    .optional()
    .describe('Blend mode for the emitted ribbon polygon.'),
  zIndex: z
    .number()
    .int()
    .finite()
    .optional()
    .describe('Explicit stacking order among sibling IR children.'),
  samples: z
    .number()
    .int()
    .min(2)
    .max(512)
    .optional()
    .describe('Number of cross-section samples; shorthand for sampling.kind = fixed.'),
  sampling: RibbonSamplingSchema.optional().describe(
    'Explicit sampling strategy. Cannot be combined with samples.',
  ),
  startCap: z
    .enum(RibbonCap)
    .optional()
    .describe('Cap style used at the start boundary of the emitted ribbon polygon.'),
  endCap: z
    .enum(RibbonCap)
    .optional()
    .describe('Cap style used at the end boundary of the emitted ribbon polygon.'),
});

export const RibbonSchema = z
  .object({
    ...RibbonSharedSchema.shape,
    width: RibbonWidthSchema.optional().describe(
      'Variable width rule applied along the centerline.',
    ),
    align: z
      .enum(RibbonAlignment)
      .optional()
      .describe('Which side of the generated band stays on the centerline.'),
    startDirection: RibbonDirectionSchema.optional().describe(
      'Optional tangent direction override at offset 0; omitted means the start-to-end connection direction.',
    ),
    endDirection: RibbonDirectionSchema.optional().describe(
      'Optional tangent direction override at offset 1; omitted means the start-to-end connection direction.',
    ),
    children: z
      .array(StepSchema)
      .min(2)
      .optional()
      .describe('Open centerline step sequence; compile rejects closed or multi-subpath results.'),
    upper: z
      .array(StepSchema)
      .min(2)
      .optional()
      .describe('Explicit upper boundary path used when kind is boundary.'),
    lower: z
      .array(StepSchema)
      .min(2)
      .optional()
      .describe('Explicit lower boundary path used when kind is boundary.'),
  })
  .strict()
  .superRefine((ribbon, ctx) => {
    if (ribbon.samples !== undefined && ribbon.sampling !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sampling'],
        message: 'Use either `samples` or `sampling`, not both.',
      });
    }
    if (ribbon.kind === 'boundary') {
      if (ribbon.upper === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['upper'],
          message: 'Boundary ribbons require `upper` steps.',
        });
      }
      if (ribbon.lower === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lower'],
          message: 'Boundary ribbons require `lower` steps.',
        });
      }
      for (const field of ['width', 'children', 'align', 'startDirection', 'endDirection'] as const) {
        if (ribbon[field] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `Boundary ribbons do not use \`${field}\`.`,
          });
        }
      }
      return;
    }
    if (ribbon.width === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['width'],
        message: 'Centerline ribbons require `width`.',
      });
    }
    if (ribbon.children === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['children'],
        message: 'Centerline ribbons require centerline `children` steps.',
      });
    }
    for (const field of ['upper', 'lower'] as const) {
      if (ribbon[field] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `Centerline ribbons do not use \`${field}\`.`,
        });
      }
    }
  })
  .describe('A variable-width filled path lowered from a centerline into a closed polygon.');

export type IRRibbonWidthStop = z.infer<typeof RibbonWidthStopSchema>;
export type IRRibbonWidth = z.infer<typeof RibbonWidthSchema>;
export type IRRibbonSampling = z.infer<typeof RibbonSamplingSchema>;
export type IRRibbon = z.infer<typeof RibbonSchema>;
