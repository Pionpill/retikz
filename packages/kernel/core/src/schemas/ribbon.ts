import { z } from 'zod';
import { AnimationTrackSchema } from './animation';
import { BlendMode, DropShadowSchema, ShadowPreset } from './effects';
import { JsonObjectSchema } from './json';
import { PaintSpecSchema } from './paint';
import { StepSchema } from './path';
import { PolarPositionSchema, Vector2Schema } from './position';
import type { PolarPosition } from '../geometry/polar';
import type { Vector2 } from '../geometry/point';

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

export const RibbonSchema = z
  .object({
    type: z
      .literal('ribbon')
      .describe('Discriminator marking this child as a variable-width ribbon.'),
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
    width: RibbonWidthSchema.describe('Variable width rule applied along the centerline.'),
    startDirection: RibbonDirectionSchema.optional().describe(
      'Optional tangent direction override at offset 0; omitted means the start-to-end connection direction.',
    ),
    endDirection: RibbonDirectionSchema.optional().describe(
      'Optional tangent direction override at offset 1; omitted means the start-to-end connection direction.',
    ),
    samples: z
      .number()
      .int()
      .min(2)
      .max(512)
      .optional()
      .describe('Number of cross-section samples used to approximate the ribbon polygon.'),
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
    children: z
      .array(StepSchema)
      .min(2)
      .describe('Open centerline step sequence; compile rejects closed or multi-subpath results.'),
  })
  .strict()
  .describe('A variable-width filled path lowered from a centerline into a closed polygon.');

export type IRRibbonWidthStop = z.infer<typeof RibbonWidthStopSchema>;
export type IRRibbonWidth = z.infer<typeof RibbonWidthSchema>;
export type IRRibbon = z.infer<typeof RibbonSchema>;
