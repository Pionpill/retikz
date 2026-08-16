import { PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import type { IRClip } from './types';

import { JsonObjectSchema } from '../json';
import { ClipFillRule } from './constants';

export const ClipFillRuleSchema = z.enum(ClipFillRule).describe('Fill rule used by path-like clip regions.');

export const RectClipSchema = z
  .strictObject({
    kind: z.literal('rect').describe('Discriminator for rectangular clip regions.'),
    x: z.number().describe('Rect left-top x in scope-local coords.'),
    y: z.number().describe('Rect left-top y in scope-local coords.'),
    width: PositiveNumberSchema.describe('Rect width in user units.'),
    height: PositiveNumberSchema.describe('Rect height in user units.'),
  })
  .describe('Rectangular clip region.');

export const CircleClipSchema = z
  .strictObject({
    kind: z.literal('circle').describe('Discriminator for circular clip regions.'),
    cx: z.number().describe('Circle center x.'),
    cy: z.number().describe('Circle center y.'),
    r: PositiveNumberSchema.describe('Circle radius in user units.'),
  })
  .describe('Circular clip region.');

export const EllipseClipSchema = z
  .strictObject({
    kind: z.literal('ellipse').describe('Discriminator for elliptical clip regions.'),
    cx: z.number().describe('Ellipse center x.'),
    cy: z.number().describe('Ellipse center y.'),
    rx: PositiveNumberSchema.describe('Ellipse x radius in user units.'),
    ry: PositiveNumberSchema.describe('Ellipse y radius in user units.'),
  })
  .describe('Elliptical clip region.');

const RESERVED_CLIP_KINDS = new Set(['rect', 'circle', 'ellipse']);

const CustomClipSchema = z
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

export const ClipSchema: z.ZodType<IRClip> = z
  .lazy(() => z.union([RectClipSchema, CircleClipSchema, EllipseClipSchema, CustomClipSchema]))
  .describe(
    'Clip region for `Scope.clip`: built-in rect/circle/ellipse, or a JSON-safe custom object registered by kind.',
  );
