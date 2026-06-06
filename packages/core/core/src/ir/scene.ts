import { z } from 'zod';
import { AnimationTrackSchema } from './animation';
import { CompositeNodeSchema, type IRComposite } from './composite';
import { CoordinateSchema, type IRCoordinate } from './coordinate';
import { type IRNode, NodeSchema } from './node';
import { type IRPath, PathSchema } from './path';
import { type IRScope, ScopeSchema, __registerChildSchema } from './scope';

/**
 * 顶层 Scene 的子节点：tier1 node / path / coordinate / scope，或 tier2 composite（有 namespace）
 * @description 手写而非 z.infer 派生，与 ScopeSchema 互递归（scope.children 也是 IRChild[]）
 */
export type IRChild = IRNode | IRPath | IRCoordinate | IRScope | IRComposite;

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
        'Tier 1 scene child: a node, a path, a coordinate placeholder, or a scope container; discriminator field is `type`',
      ),
    CompositeNodeSchema.describe(
      'Tier 2 composite node: carries `namespace` + `type`; precise field validation happens at compile via the registered domain schema',
    ),
  ]),
);

// 把 ChildSchema 注册回 scope.ts 让 ScopeSchema.children 能延迟解析此 schema（解决双向依赖）
__registerChildSchema(ChildSchema);

/**
 * 显式视框 schema（覆盖自动算的 layout 范围）
 * @description 具名四字段（与 Scene.layout / SVG viewBox 同构）；width / height `.positive().finite()`、
 *   x / y `.finite()` 守 Scene JSON 可序列化。设值时 compile 直接用它作 Scene.layout、忽略 padding。
 */
export const ViewBoxSchema = z
  .object({
    x: z.number().finite().describe('ViewBox left-top x'),
    y: z.number().finite().describe('ViewBox left-top y'),
    width: z.number().finite().positive().describe('ViewBox width (> 0)'),
    height: z.number().finite().positive().describe('ViewBox height (> 0)'),
  })
  .describe(
    'Explicit viewBox overriding the auto-computed layout range (fixed size / clipping / multi-figure alignment). When set, Scene.layout uses it directly and padding is ignored.',
  );

/** 显式视框 IR 类型 `{ x, y, width, height }` */
export type IRViewBox = z.infer<typeof ViewBoxSchema>;

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
        'Scene-root (camera) timeline animation tracks; the `viewBox` property animates the framing (zoom / pan). Carried verbatim into the compiled Scene; renderers play them or render the static layout with a diagnosable warning when unable. The static `layout` is always the settled (rest) framing — camera animation never affects it.',
      ),
  })
  .describe(
    'Top-level retikz IR scene — the canonical, JSON-serializable representation of a drawing',
  );

/** retikz IR 顶层 Scene——可序列化 JSON 形式的绘制描述 */
export type IR = z.infer<typeof SceneSchema>;

/** IR 当前主版本号；只在 schema 出现破坏性变更时递增 */
export const CURRENT_IR_VERSION = 1 as const;
