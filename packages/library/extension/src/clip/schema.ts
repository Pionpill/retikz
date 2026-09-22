import { ClipFillRuleSchema, ClipSchema, PathCommandSchema, PositionSchema } from '@retikz/core';
import { PositiveNumberSchema } from '@retikz/foundation';
import { array, literal, number, strictObject } from 'zod';

export const CircleClipSchema = strictObject({
  kind: literal('circle').describe('Discriminator for circular clip regions.'),
  cx: number().describe('Circle center x.'),
  cy: number().describe('Circle center y.'),
  r: PositiveNumberSchema.describe('Circle radius in user units.'),
}).describe('Circular clip region.');

export const EllipseClipSchema = strictObject({
  kind: literal('ellipse').describe('Discriminator for elliptical clip regions.'),
  cx: number().describe('Ellipse center x.'),
  cy: number().describe('Ellipse center y.'),
  rx: PositiveNumberSchema.describe('Ellipse x radius in user units.'),
  ry: PositiveNumberSchema.describe('Ellipse y radius in user units.'),
}).describe('Elliptical clip region.');

export const PolygonClipSchema = strictObject({
  kind: literal('polygon').describe('Discriminator for polygon clip regions.'),
  points: array(PositionSchema).min(3).describe('Polygon vertices as [x, y] tuples.'),
}).describe('Polygon clip region.');

export const PathClipSchema = strictObject({
  kind: literal('path').describe('Discriminator for path clip regions.'),
  commands: array(PathCommandSchema).min(1).describe('Structured path commands for the clip region.'),
  fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the path clip.'),
}).describe('Path clip region.');

export const CompoundClipSchema = strictObject({
  kind: literal('compound').describe('Discriminator for compound clip regions.'),
  children: array(ClipSchema).min(1).describe('Child clip operations resolved through the active Core clip registry.'),
  fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the accumulated compound clip path.'),
}).describe('Compound clip region.');
