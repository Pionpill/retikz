import { z } from 'zod';

import type { IRChild } from './types';

import { AnimationTrackSchema } from '../animation';
import { CompositeNodeSchema } from '../composite';
import { CoordinateSchema } from '../coordinate';
import { NodeSchema } from '../node';
import { PathSchema } from '../path';
import { __registerChildSchema, ScopeSchema } from '../scope';

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

// 把 ChildSchema 注册回 scope.ts 让 ScopeSchema.children 能延迟解析此 schema（解决双向依赖）
__registerChildSchema(ChildSchema);

export const ViewBoxSchema = z
  .object({
    x: z.number().describe('ViewBox left-top x'),
    y: z.number().describe('ViewBox left-top y'),
    width: z.number().positive().describe('ViewBox width in user units.'),
    height: z.number().positive().describe('ViewBox height in user units.'),
  })
  .describe(
    'Explicit viewBox overriding the auto-computed layout range (fixed size / clipping / multi-figure alignment). When set, Scene.layout uses it directly and padding is ignored.',
  );

export const SceneSchema = z
  .object({
    version: z.literal(1).describe('IR major version number; bump only on breaking schema changes'),
    type: z.literal('scene').describe('Discriminator marking this object as the root scene'),
    children: z
      .array(ChildSchema)
      .describe('Top-level children of the scene; nodes register ids that paths can reference'),
    viewBox: ViewBoxSchema.optional().describe(
      'Optional explicit viewBox; when set, Scene.layout uses it (ignoring padding) instead of the auto-computed bounding box. Omitted = automatic AABB + padding.',
    ),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Scene-root animation tracks. Use the `viewBox` property to animate framing; static layout remains the settled framing.',
      ),
  })
  .describe('Top-level retikz IR scene — the canonical, JSON-serializable representation of a drawing');
