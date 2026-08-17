import { ClipFillRuleSchema, ClipSchema, PathCommandSchema, PositionSchema } from '@retikz/core';
import { PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

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

export const PolygonClipSchema = z
  .strictObject({
    kind: z.literal('polygon').describe('Discriminator for polygon clip regions.'),
    points: z.array(PositionSchema).min(3).describe('Polygon vertices as [x, y] tuples.'),
  })
  .describe('Polygon clip region.');

export const PathClipSchema = z
  .strictObject({
    kind: z.literal('path').describe('Discriminator for path clip regions.'),
    commands: z.array(PathCommandSchema).min(1).describe('Structured path commands for the clip region.'),
    fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the path clip.'),
  })
  .describe('Path clip region.');

export const CompoundClipSchema = z
  .strictObject({
    kind: z.literal('compound').describe('Discriminator for compound clip regions.'),
    children: z
      .array(ClipSchema)
      .min(1)
      .describe('Child clip operations resolved through the active Core clip registry.'),
    fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the accumulated compound clip path.'),
  })
  .describe('Compound clip region.');
