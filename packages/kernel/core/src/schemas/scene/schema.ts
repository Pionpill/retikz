import { z } from 'zod';
import { AnimationTrackSchema } from '../animation';
import { CompositeNodeSchema } from '../composite';
import { CoordinateSchema } from '../coordinate';
import { NodeSchema } from '../node';
import { PathSchema } from '../path';
import { ScopeSchema, __registerChildSchema } from '../scope';
import type { IRChild } from './types';

/**
 * ChildSchema：tier1 四类 discriminatedUnion（按 type）+ tier2 开放节点（有 namespace）
 * @description tier1 节点无 namespace、按 `type` 判别；tier2 节点有 namespace（CompositeNodeSchema passthrough）。
 *   namespace 必填 / 缺失互斥，union 天然无歧义分流；精确字段校验在 compile 期由 lowerComposites 用注册 schema 完成。
 *   用 `z.ZodType<IRChild>` + `z.lazy` 让 ScopeSchema.children 能递归引用自己。
 */
export const ChildSchema: z.ZodType<IRChild> = z.lazy(() =>
  z.union([
    z
      .discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema, ScopeSchema])
      .describe(
        'Tier 1 scene child: node, path, coordinate, or scope. Discriminator field is `type`.',
      ),
    CompositeNodeSchema.describe(
      'Tier 2 composite node with `namespace` and `type`. Registered domain schemas validate additional fields at compile time.',
    ),
  ]),
);

// 把 ChildSchema 注册回 scope.ts 让 ScopeSchema.children 能延迟解析此 schema（解决双向依赖）
__registerChildSchema(ChildSchema);

/**
 * 显式视框 schema（覆盖自动算的 layout 范围）
 * @description 具名四字段（与 Scene.layout / SVG viewBox 同构）；width / height `.positive()`、
 *   x / y `` 守 Scene JSON 可序列化。设值时 compile 直接用它作 Scene.layout、忽略 padding。
 */
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
    version: z
      .literal(1)
      .describe(
        'IR major version number; bump only on breaking schema changes',
      ),
    type: z
      .literal('scene')
      .describe('Discriminator marking this object as the root scene'),
    children: z
      .array(ChildSchema)
      .describe(
        'Top-level children of the scene; nodes register ids that paths can reference',
      ),
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
  .describe(
    'Top-level retikz IR scene — the canonical, JSON-serializable representation of a drawing',
  );
