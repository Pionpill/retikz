import { z } from 'zod';

import type { IRComposite } from '../composite';
import type { IRCoordinate } from '../coordinate';
import type { IRNode } from '../node';
import type { IRPathBase } from '../path';
import type { IRScope } from './types';

import { AnimationTrackSchema } from '../animation';
import { ClipSpecSchema } from '../clip';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import { NodeSchema } from '../node';
import { PaintSpecSchema } from '../paint';
import { PathBaseSchema } from '../path';
import { ArrowDetailSchema } from '../path/arrow';
import { TransformSchema } from '../transform';
import { ScopeBoundingShape } from './constants';

// ===========================================================================
// every-X 四通道默认 schema —— 各从对应元素 schema `.omit()` 派生（单一真源，禁手抄）
// 全字段 optional（继承自源 schema）、顶层 `.strict()` 严拒未知 / 被排除字段
// ===========================================================================

/**
 * every node 默认样式 schema
 * @description 从 NodeSchema 派生，排除实例专属字段（type / id / position / text / label）；
 *   含形状 / 间距 / scale / rotate / color 等所有可作默认的 node 样式字段
 */
export const NodeDefaultSchema = NodeSchema.omit({
  type: true,
  id: true,
  position: true,
  text: true,
  label: true,
  zIndex: true,
  meta: true,
  animations: true,
}).strict();

/**
 * every path 默认样式 schema
 * @description 从 PathSchema 派生，排除实例专属字段（type / id / children）与 arrow / arrowDetail
 *   （arrow 走独立 arrowDefault 通道，免双入口）。id 是实例水合挂点，作默认会被 stamp 到 scope 内每条 path
 *   造成挂点冲突，故与 NodeDefault 一致排除。
 */
export const PathDefaultSchema = PathBaseSchema.omit({
  type: true,
  kind: true,
  kindOptions: true,
  ribbon: true,
  label: true,
  id: true,
  children: true,
  arrow: true,
  arrowDetail: true,
  zIndex: true,
  meta: true,
  animations: true,
}).strict();

/**
 * every label 默认样式 schema（node label 与 step label 共享）
 * @description 单通道双宿主：node-label 跟 node.color、step-label 跟 path.color；本 schema 只定义可继承的 label 样式字段
 */
export const LabelDefaultSchema = z
  .object({
    color: z.string().optional().describe('Master color for labels in this scope; textColor falls back to it.'),
    textColor: z.string().optional().describe('Default text color for node labels and step labels in this scope.'),
    opacity: z.number().min(0).max(1).optional().describe('Default label opacity.'),
    font: FontSchema.optional().describe('Default label font (family / size / weight / style); per-field fallback.'),
  })
  .strict()
  .describe('Default style applied to node labels and step labels in this scope.');

/**
 * every arrow 默认样式 schema
 * @description 直接复用 ArrowDetailSchema（shape / scale / length / width / color / fill / opacity / lineWidth + start / end）
 */
export const ArrowDefaultSchema = ArrowDetailSchema;

// ChildSchema 在 scene.ts 中定义并通过 z.lazy 注入；让 scope.children 能在
// ChildSchema 完成定义后才被实际触达（schema 层与文件层都不形成 hard 循环依赖）。
/** scope 子节点 union——与 scene.ts 的 IRChild 同构（此处内联避免文件层循环依赖） */
type ScopeChild = IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite;

/** schema 注册顺序：scene.ts import 时由 __registerChildSchema 一次性回灌；之后只读 */
let childSchemaRef: z.ZodType<ScopeChild> | null = null;

/**
 * 注册 ChildSchema 引用——由 scene.ts 在定义 ChildSchema 后调用一次
 * @description 解决 scope.children 用 ChildSchema 与 scene.ChildSchema discriminatedUnion 用 ScopeSchema 的双向依赖
 */
export const __registerChildSchema = (schema: z.ZodType<ScopeChild>): void => {
  childSchemaRef = schema;
};

/**
 * Scope schema：容器 + 局部 transform + 样式默认挂点
 * @description 直接 `z.object` 让 ChildSchema discriminatedUnion 能识别 `type` 鉴别字段；
 * children 字段内部用 z.lazy 引用 ChildSchema 实现递归，避免直接 `z.lazy(() => z.object(...))` 让外层 union 拒识 type。
 * 支持：① 级联 graphic state（color + stroke / fill / strokeWidth / opacity / fillOpacity / drawOpacity）；
 * ② 四通道 every-X 默认（nodeDefault / pathDefault / labelDefault / arrowDefault）；③ resetStyle 继承屏障。
 */
export const ScopeSchema = z
  .object({
    type: z.literal('scope').describe('Discriminator marking this child as a scope container.'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Optional reference id for targeting the scope as a whole. Always registers in the parent namespace.'),
    localNamespace: z
      .boolean()
      .optional()
      .describe(
        'When true, child node, coordinate, and nested-scope ids stay local to this scope. The scope id itself still registers in the parent namespace.',
      ),
    transforms: z
      .array(TransformSchema)
      .optional()
      .describe(
        'Local transforms applied to all scope children. Array order is application order; translate variants are lowered at compile time.',
      ),
    color: z
      .string()
      .optional()
      .describe(
        'Cascading master color for elements in this scope. Stroke, fill, text, labels, and arrows may inherit it unless overridden.',
      ),
    stroke: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Cascading default stroke paint (CSS color or PaintSpec: gradient / pattern / image) for inner nodes and paths; overrides the cascading master color for the stroke channel.',
      ),
    fill: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Cascading default fill (CSS color or PaintSpec: gradient / pattern / image) for inner nodes and paths.',
      ),
    strokeWidth: z
      .number()
      .nonnegative()
      .optional()
      .describe('Cascading default stroke width (user units) for inner nodes and paths.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Cascading whole-element opacity. Nested scopes replace it rather than compounding it.'),
    fillOpacity: z.number().min(0).max(1).optional().describe('Cascading fill-only opacity for inner nodes and paths.'),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Cascading stroke-only opacity for inner nodes and paths.'),
    nodeDefault: NodeDefaultSchema.optional().describe(
      'Default style applied to nodes in this scope. Independent from the other default channels.',
    ),
    pathDefault: PathDefaultSchema.optional().describe(
      'Default style applied to path-like drawables in this scope. Arrows use the separate `arrowDefault` channel.',
    ),
    labelDefault: LabelDefaultSchema.optional().describe(
      'Default style applied to node labels and step labels in this scope.',
    ),
    arrowDefault: ArrowDefaultSchema.optional().describe('Default style applied to arrows in this scope.'),
    resetStyle: z
      .union([z.boolean(), z.array(z.enum(['node', 'path', 'label', 'arrow']))])
      .optional()
      .describe(
        'Inheritance barrier for style defaults. Use true for all channels, or list node, path, label, and arrow channels to reset.',
      ),
    zIndex: z
      .number()
      .int()
      .optional()
      .describe(
        'Stacking order of this scope among sibling IR children. Applies to the scope group as one unit, not to children inside it.',
      ),
    clip: ClipSpecSchema.optional().describe(
      'Clip region for this scope in scope-local coordinates. Applies to clipped children through the emitted scope group.',
    ),
    boundingShape: z
      .enum(ScopeBoundingShape)
      .optional()
      .describe(
        "Shape of the synthetic bounding envelope for this scope's `id`: rectangle or circle. This is a closed enum, not a shape provider reference.",
      ),
    meta: JsonObjectSchema.optional().describe(
      'Opaque JSON metadata carried by this scope. Preserved into emitted Scene primitives and ignored by the compiler.',
    ),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Declarative animation tracks for this scope as a group. They do not affect layout and are not propagated to child elements.',
      ),
    children: z
      .array(
        z.lazy(() => {
          if (!childSchemaRef) {
            throw new Error('ScopeSchema: ChildSchema not registered yet; ensure scene.ts loaded');
          }
          return childSchemaRef;
        }),
      )
      .describe(
        'Scope children: nested nodes / paths / coordinates / scopes. Recursive via the parent ChildSchema (registered late to break the IRChild <-> IRScope cycle).',
      ),
  })
  .strict()
  .describe(
    'Scope container: groups child IR elements, applies local transforms, and provides cascading style defaults.',
  );
