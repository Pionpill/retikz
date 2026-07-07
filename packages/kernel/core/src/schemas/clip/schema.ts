import { z } from 'zod';

import type { IRClipSpec, IRCompoundClipSpec } from './types';

import { JsonObjectSchema } from '../json';
import { PathCommandSchema } from '../path-command';
import { ClipFillRule } from './constants';

export const ClipFillRuleSchema = z.enum(ClipFillRule).describe('Fill rule used by path-like clip regions.');

export const RectClipSchema = z
  .strictObject({
    kind: z.literal('rect').describe('Discriminator for rectangular clip regions.'),
    x: z.number().describe('Rect left-top x in scope-local coords.'),
    y: z.number().describe('Rect left-top y in scope-local coords.'),
    width: z.number().positive().describe('Rect width in user units.'),
    height: z.number().positive().describe('Rect height in user units.'),
  })
  .describe('Rectangular clip region.');

export const CircleClipSchema = z
  .strictObject({
    kind: z.literal('circle').describe('Discriminator for circular clip regions.'),
    cx: z.number().describe('Circle center x.'),
    cy: z.number().describe('Circle center y.'),
    r: z.number().positive().describe('Circle radius in user units.'),
  })
  .describe('Circular clip region.');

export const EllipseClipSchema = z
  .strictObject({
    kind: z.literal('ellipse').describe('Discriminator for elliptical clip regions.'),
    cx: z.number().describe('Ellipse center x.'),
    cy: z.number().describe('Ellipse center y.'),
    rx: z.number().positive().describe('Ellipse x radius in user units.'),
    ry: z.number().positive().describe('Ellipse y radius in user units.'),
  })
  .describe('Elliptical clip region.');

export const PolygonClipSchema = z
  .strictObject({
    kind: z.literal('polygon').describe('Discriminator for polygon clip regions.'),
    points: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3)
      .describe('Polygon vertices as [x, y] tuples.'),
  })
  .describe('Polygon clip region.');

export const PathClipSchema = z
  .strictObject({
    kind: z.literal('path').describe('Discriminator for path clip regions.'),
    commands: z.array(PathCommandSchema).min(1).describe('Structured path commands for the clip region.'),
    fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the path clip.'),
  })
  .describe('Path clip region.');

export const CompoundClipSchema: z.ZodType<IRCompoundClipSpec> = z.lazy(() =>
  z
    .strictObject({
      kind: z.literal('compound').describe('Discriminator for compound clip regions.'),
      children: z.array(ClipSpecSchema).min(1).describe('Child clip regions combined into one clip path.'),
      fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the accumulated compound clip path.'),
    })
    .describe('Compound clip region.'),
);

const RESERVED_CLIP_KINDS = new Set(['rect', 'circle', 'ellipse', 'polygon', 'path', 'compound']);

const CustomClipSpecSchema = z
  .intersection(
    z.object({
      kind: z.string().min(1).describe('Custom clip discriminator registered through CompileOptions.clips.'),
    }),
    JsonObjectSchema,
  )
  .superRefine((value, ctx) => {
    if (RESERVED_CLIP_KINDS.has(value.kind)) {
      ctx.addIssue({
        code: 'custom',
        message: `Builtin clip kind '${value.kind}' must match its builtin schema.`,
        path: ['kind'],
      });
    }
  })
  .describe('Custom clip spec. Its kind must be registered through CompileOptions.clips.');

export const ClipSpecSchema: z.ZodType<IRClipSpec> = z
  .lazy(() =>
    z.union([
      RectClipSchema,
      CircleClipSchema,
      EllipseClipSchema,
      PolygonClipSchema,
      PathClipSchema,
      CompoundClipSchema,
      CustomClipSpecSchema,
    ]),
  )
  .describe(
    'Clip region for `Scope.clip`: built-in rect/circle/ellipse/polygon/path/compound, or a custom JSON object registered by kind.',
  );
