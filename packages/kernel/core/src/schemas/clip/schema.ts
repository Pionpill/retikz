import { NonNegativeNumberSchema } from '@retikz/foundation';
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
    width: NonNegativeNumberSchema.describe('Rect width in user units; zero produces an empty clip region.'),
    height: NonNegativeNumberSchema.describe('Rect height in user units; zero produces an empty clip region.'),
  })
  .describe('Rectangular clip region.');

const RESERVED_CLIP_KINDS = new Set(['rect']);

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
  .lazy(() => z.union([RectClipSchema, CustomClipSchema]))
  .describe('Clip region for `Scope.clip`: built-in rect or a JSON-safe custom object registered by kind.');
