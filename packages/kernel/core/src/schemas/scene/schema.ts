import { PositiveNumberSchema } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { array, discriminatedUnion, lazy, literal, number, strictObject, union } from 'zod';

import { AnimationTrackSchema } from '../animation';
import { CompositeNodeSchema } from '../composite';
import { CoordinateSchema } from '../coordinate';
import { NodeSchema } from '../node';
import { PathSchema } from '../path';
import { registerRecursiveChildSchema } from '../recursive';
import { ScopeSchema } from '../scope';
import { ThemeSchema } from '../theme';
import type { IRChild } from './types';

export const ChildSchema: ZodType<IRChild> = lazy(() =>
  union([
    discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema, ScopeSchema]).describe(
      'Tier 1 scene child: node, path, coordinate, or scope. Discriminator field is `type`.',
    ),
    CompositeNodeSchema.describe(
      'Tier 2 composite node with `namespace` and `type`. Registered domain schemas validate additional fields at compile time.',
    ),
  ]),
);

registerRecursiveChildSchema(ChildSchema);

export const ViewBoxSchema = strictObject({
  x: number().describe('Left edge in scene coordinate units; must be finite and may be negative.'),
  y: number().describe('Top edge in scene coordinate units; must be finite and may be negative.'),
  width: PositiveNumberSchema.describe('Width in scene coordinate units; must be finite and greater than zero.'),
  height: PositiveNumberSchema.describe('Height in scene coordinate units; must be finite and greater than zero.'),
}).describe('Visible scene rectangle, specified by its top-left corner, width, and height.');

export const SceneSchema = strictObject({
  type: literal('scene').describe('Discriminator marking this object as the root scene'),
  version: literal(1).describe('Scene data format version; currently must be 1, independent of the package version.'),
  theme: ThemeSchema.optional().describe('Root theme selection; sets only the style and mode fields to override.'),
  children: array(ChildSchema).describe('Ordered top-level scene children; an empty array is allowed.'),
  viewBox: ViewBoxSchema.optional().describe(
    'Explicit framing; when omitted, bounds are computed from content plus padding.',
  ),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe(
      'Scene-root animation tracks, including viewBox framing animations; omitting this field adds no root tracks.',
    ),
}).describe('JSON-serializable scene data describing one drawing.');
