import { z } from 'zod';

import type { IRRibbonDirection } from './types';

import { JsonObjectSchema } from '../../json';
import { PolarPositionSchema, PositionSchema, Vector2Schema } from '../../position';
import { AngleDegreesSchema, NormalizedFractionSchema } from '../../scalar';
import { StepSchema } from '../step';
import { RibbonAlignment, RibbonArcCapSweep, RibbonCap, RibbonMode } from './constants';

export const RibbonArcCapSchema = z
  .object({
    type: z.literal('arc').describe('Discriminator for an explicit circular arc cap.'),
    center: z
      .union([PositionSchema, PolarPositionSchema])
      .describe('Arc center as a Cartesian position or PolarPosition sugar.'),
    radius: z
      .number()
      .positive()
      .describe('Arc radius in user units; both ribbon side endpoints must lie on this circle.'),
    sweep: z
      .enum(RibbonArcCapSweep)
      .optional()
      .describe('Which circular sweep connects the two ribbon sides; omitted means short.'),
  })
  .strict()
  .describe('Endpoint cap closed by an explicit circular arc.');

export const RibbonCapSchema = z
  .union([z.enum(RibbonCap), RibbonArcCapSchema])
  .describe('Ribbon endpoint cap: built-in cap name or explicit circular arc cap.');

export const RibbonWidthStopSchema = z
  .object({
    offset: NormalizedFractionSchema.describe('Normalized position along the centerline.'),
    value: z
      .number()
      .nonnegative()
      .describe('Ribbon width in user units at this stop.'),
  })
  .strict()
  .describe('One stop in a sampled ribbon width curve.');

export const RibbonWidthStopsSchema = z
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
  .describe('A multi-stop ribbon width rule.');

export const RibbonWidthProfileSchema = z
  .object({
    kind: z.literal('profile').describe('Discriminator for registered width profiles.'),
    name: z
      .string()
      .min(1)
      .describe('Registered ribbon width profile name from CompileOptions.ribbonWidthProfiles.'),
    params: JsonObjectSchema.optional().describe('JSON-safe profile parameters.'),
  })
  .strict()
  .describe('A registered width profile reference.');

export const RibbonWidthSchema = z
  .union([z.number().nonnegative(), RibbonWidthStopsSchema, RibbonWidthProfileSchema])
  .describe(
    'Ribbon width rule: fixed number, stop curve, or registered profile reference. Endpoint taper widths live on start.width and end.width.',
  );

export const RibbonDirectionSchema: z.ZodType<IRRibbonDirection> = z
  .union([
    AngleDegreesSchema.describe('Direction angle in degrees, where 0 points to the positive x axis.'),
    Vector2Schema.refine(([x, y]) => x !== 0 || y !== 0, {
      message: 'Ribbon direction vector must not be zero length.',
    }).describe(
      'Direction vector [x, y]; Position tuples share the same shape and are treated as vectors from the origin.',
    ),
    PolarPositionSchema.describe('PolarPosition sugar converted to a vector before normalization.'),
  ])
  .describe('Endpoint tangent direction override as an angle, Vector2/Position tuple, or PolarPosition sugar.');

export const RibbonEndpointSchema = z
  .object({
    width: z
      .number()
      .nonnegative()
      .optional()
      .describe('Ribbon width in user units at this endpoint.'),
    direction: RibbonDirectionSchema.optional().describe(
      'Optional tangent direction override at this endpoint; omitted means the start-to-end connection direction.',
    ),
    cap: RibbonCapSchema.optional().describe('Cap style used at this endpoint of the emitted ribbon polygon.'),
  })
  .strict()
  .describe('Endpoint-local ribbon properties such as width, tangent direction, and cap.');

export const RibbonFixedSamplingSchema = z
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
  .describe('Fixed ribbon sampling strategy.');

export const RibbonAdaptiveSamplingSchema = z
  .object({
    kind: z.literal('adaptive').describe('Choose a sample count from path length and tolerance.'),
    tolerance: z
      .number()
      .positive()
      .describe('Approximate target segment length in user units.'),
    maxSamples: z.number().int().min(2).max(512).optional().describe('Optional upper bound for generated samples.'),
  })
  .strict()
  .describe('Length-aware adaptive ribbon sampling strategy.');

export const RibbonSamplingSchema = z
  .union([RibbonFixedSamplingSchema, RibbonAdaptiveSamplingSchema])
  .describe('Ribbon boundary sampling strategy; `samples` is retained as a shorthand for fixed sampling.');

export const PathRibbonOptionsSchema = z
  .object({
    mode: z.enum(RibbonMode).optional().describe('Ribbon construction mode; omitted means centerline.'),
    samples: z
      .union([z.boolean(), z.number().int().min(2).max(512)])
      .optional()
      .describe(
        'Sampling override for centerline lowering; true uses 64 samples, a number uses that fixed sample count, omitted keeps automatic lowering.',
      ),
    sampling: RibbonSamplingSchema.optional().describe('Explicit sampling strategy. Cannot be combined with samples.'),
    width: RibbonWidthSchema.optional().describe(
      'Whole-ribbon width rule applied along the centerline; use start.width/end.width for two-end taper.',
    ),
    start: RibbonEndpointSchema.optional().describe('Start endpoint properties: width, tangent direction, and cap.'),
    end: RibbonEndpointSchema.optional().describe('End endpoint properties: width, tangent direction, and cap.'),
    interpolation: z
      .enum(['linear', 'smooth'])
      .optional()
      .describe('Interpolation curve between start.width and end.width.'),
    align: z.enum(RibbonAlignment).optional().describe('Which side of the generated band stays on the centerline.'),
    upper: z.array(StepSchema).min(2).optional().describe('Explicit upper boundary path used when kind is boundary.'),
    lower: z.array(StepSchema).min(2).optional().describe('Explicit lower boundary path used when kind is boundary.'),
  })
  .strict()
  .superRefine((options, ctx) => {
    if (options.samples !== undefined && options.sampling !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sampling'],
        message: 'Use either `samples` or `sampling`, not both.',
      });
    }
    if (options.mode === 'boundary') {
      if (options.upper === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['upper'],
          message: 'Boundary ribbons require `upper` steps.',
        });
      }
      if (options.lower === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lower'],
          message: 'Boundary ribbons require `lower` steps.',
        });
      }
      for (const field of ['width', 'align', 'start', 'end', 'interpolation'] as const) {
        if (options[field] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `Boundary ribbons do not use \`${field}\`.`,
          });
        }
      }
      return;
    }
    const hasStartWidth = options.start?.width !== undefined;
    const hasEndWidth = options.end?.width !== undefined;
    if (options.width !== undefined && (hasStartWidth || hasEndWidth)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['width'],
        message: 'Use either top-level `width` or `start.width` + `end.width`, not both.',
      });
    }
    if (options.width === undefined && (!hasStartWidth || !hasEndWidth)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['start'],
        message: 'Centerline ribbons require either top-level `width` or both `start.width` and `end.width`.',
      });
    }
    if (options.width !== undefined && options.interpolation !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['interpolation'],
        message: '`interpolation` only applies to start.width/end.width taper.',
      });
    }
    for (const field of ['upper', 'lower'] as const) {
      if (options[field] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `Centerline ribbons do not use \`${field}\`.`,
        });
      }
    }
  })
  .describe('Ribbon-specific options for Path kind=ribbon.');
