import { z } from 'zod';

import type { IRChild } from './types';

import { AnimationTrackSchema } from '../animation';
import { CompositeNodeSchema } from '../composite';
import { CoordinateSchema } from '../coordinate';
import { NodeSchema } from '../node';
import { PathSchema } from '../path';
import { registerRecursiveChildSchema } from '../recursive';
import { ScopeSchema } from '../scope';
import { ThemeSchema } from '../theme';

export const ChildSchema: z.ZodType<IRChild> = z.lazy(() =>
  z.union([
    z
      .discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema, ScopeSchema])
      .describe('Tier 1 scene child: node, path, coordinate, or scope. Discriminator field is `type`.'),
    CompositeNodeSchema.describe(
      'Tier 2 composite node with `namespace` and `type`. Registered domain schemas validate additional fields at compile time.',
    ),
  ]),
);

registerRecursiveChildSchema(ChildSchema);

export const ViewBoxSchema = z
  .strictObject({
    x: z.number().describe('ViewBox left-top x'),
    y: z.number().describe('ViewBox left-top y'),
    width: z.number().positive().describe('ViewBox width in user units.'),
    height: z.number().positive().describe('ViewBox height in user units.'),
  })
  .describe('Explicit viewBox overriding auto-computed layout bounds.');

export const SceneSchema = z
  .strictObject({
    type: z.literal('scene').describe('Discriminator marking this object as the root scene'),
    version: z.literal(1).describe('IR major version number; bump only on breaking schema changes'),
    theme: ThemeSchema.optional().describe('Sparse root Theme inherited by every Scene child.'),
    children: z
      .array(ChildSchema)
      .describe('Top-level children of the scene; nodes register ids that paths can reference'),
    viewBox: ViewBoxSchema.optional().describe('Explicit viewBox. Omitted fields use automatic bounds plus padding.'),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Scene-root animation tracks. Use the `viewBox` property to animate framing; static layout remains the settled framing.',
      ),
  })
  .describe('Top-level retikz IR scene — the canonical, JSON-serializable representation of a drawing');
