import { z } from 'zod';
import { ClipSpecSchema, type IRClipSpec } from './clip';
import type { IRComposite } from './composite';
import type { IRCoordinate } from './coordinate';
import { FontSchema } from './font';
import { type IRJsonObject, JsonObjectSchema } from './json';
import { type IRPaintSpec, PaintSpecSchema } from './paint';
import { type IRNode, NodeSchema } from './node';
import { type IRPath, PathSchema } from './path';
import { ArrowDetailSchema } from './path/arrow';
import { type IRTransform, TransformSchema } from './transform';

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
}).strict();

/**
 * every path 默认样式 schema
 * @description 从 PathSchema 派生，排除 type / children / arrow / arrowDetail（arrow 走独立 arrowDefault 通道，免双入口）
 */
export const PathDefaultSchema = PathSchema.omit({
  type: true,
  children: true,
  arrow: true,
  arrowDetail: true,
  zIndex: true,
  meta: true,
}).strict();

/**
 * every label 默认样式 schema（node label 与 step label 共享）
 * @description 单通道双宿主：node-label 跟 node.color、step-label 跟 path.color；本 schema 只定义可继承的 label 样式字段
 */
export const LabelDefaultSchema = z
  .object({
    color: z
      .string()
      .optional()
      .describe('Master color for labels in this scope; textColor falls back to it.'),
    textColor: z
      .string()
      .optional()
      .describe('Default text color for node labels and step labels in this scope.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Default label opacity 0..1.'),
    font: FontSchema.optional().describe(
      'Default label font (family / size / weight / style); per-field fallback.',
    ),
  })
  .strict()
  .describe(
    'Default style applied to every label (node label + step label) in this scope (TikZ `every label`). All fields optional; unknown keys are rejected.',
  );

/**
 * every arrow 默认样式 schema
 * @description 直接复用 ArrowDetailSchema（shape / scale / length / width / color / fill / opacity / lineWidth + start / end）
 */
export const ArrowDefaultSchema = ArrowDetailSchema;

/** every node 默认样式（排除 type / id / position / text / label 的全部 node 样式字段） */
export type IRNodeDefault = z.infer<typeof NodeDefaultSchema>;
/** every path 默认样式（排除 type / children / arrow / arrowDetail） */
export type IRPathDefault = z.infer<typeof PathDefaultSchema>;
/** every label 默认样式（color / textColor / opacity / font） */
export type IRLabelDefault = z.infer<typeof LabelDefaultSchema>;
/** every arrow 默认样式（= ArrowDetail） */
export type IRArrowDefault = z.infer<typeof ArrowDefaultSchema>;

/** 样式继承通道标识——resetStyle 按通道切外层继承 */
export type StyleChannel = 'node' | 'path' | 'label' | 'arrow';

/**
 * Scope IR 类型——手写而非 z.infer 派生
 * @description ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union。
 *   alpha.2 起 Scope 兼作样式默认值挂点：级联 graphic state（color + 跨类共享分项）+ 四通道 every-X 默认 + resetStyle 继承屏障。
 */
export type IRScope = {
  type: 'scope';
  id?: string;
  localNamespace?: boolean;
  transforms?: Array<IRTransform>;
  color?: string;
  stroke?: string;
  fill?: string | IRPaintSpec;
  strokeWidth?: number;
  opacity?: number;
  fillOpacity?: number;
  drawOpacity?: number;
  nodeDefault?: IRNodeDefault;
  pathDefault?: IRPathDefault;
  labelDefault?: IRLabelDefault;
  arrowDefault?: IRArrowDefault;
  resetStyle?: boolean | Array<StyleChannel>;
  zIndex?: number;
  clip?: IRClipSpec;
  meta?: IRJsonObject;
  children: Array<IRNode | IRPath | IRCoordinate | IRScope | IRComposite>;
};

// ChildSchema 在 scene.ts 中定义并通过 z.lazy 注入；让 scope.children 能在
// ChildSchema 完成定义后才被实际触达（schema 层与文件层都不形成 hard 循环依赖）。
/** schema 注册顺序：scene.ts import 时由 __registerChildSchema 一次性回灌；之后只读 */
let childSchemaRef: z.ZodTypeAny | null = null;

/**
 * 注册 ChildSchema 引用——由 scene.ts 在定义 ChildSchema 后调用一次
 * @description 解决 scope.children 用 ChildSchema 与 scene.ChildSchema discriminatedUnion 用 ScopeSchema 的双向依赖
 */
export const __registerChildSchema = (schema: z.ZodTypeAny): void => {
  childSchemaRef = schema;
};

/**
 * Scope schema：容器 + 局部 transform + 样式默认挂点
 * @description 直接 `z.object` 让 ChildSchema discriminatedUnion 能识别 `type` 鉴别字段；
 * children 字段内部用 z.lazy 引用 ChildSchema 实现递归，避免直接 `z.lazy(() => z.object(...))` 让外层 union 拒识 type。
 * alpha.2 加：① 级联 graphic state（color + stroke / fill / strokeWidth / opacity / fillOpacity / drawOpacity）；
 * ② 四通道 every-X 默认（nodeDefault / pathDefault / labelDefault / arrowDefault）；③ resetStyle 继承屏障。
 */
export const ScopeSchema = z
  .object({
    type: z
      .literal('scope')
      .describe('Discriminator marking this child as a scope container.'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional reference id; when set, the scope registers a synthetic rectangle bbox node in the **parent** namespace frame so paths / positions can target the scope as a whole. scope.id always registers in the parent frame, regardless of `localNamespace` (it is the external handle).',
      ),
    localNamespace: z
      .boolean()
      .optional()
      .describe(
        'When true, the scope creates a local namespace boundary — child node / coordinate / nested-scope ids registered inside do NOT propagate to the parent namespace; external lookups cannot see them. Default false (matches TikZ pgf default: child ids flow up to global). scope.id itself always registers in the parent frame regardless of this flag.',
      ),
    transforms: z
      .array(TransformSchema)
      .optional()
      .describe(
        'Local transforms applied to all scope children; array order = application order (first element applied innermost, matching Scene `GroupPrim.transforms` / SVG transform list). Supports 6 variants; the 4 translate variants are lowered to Cartesian translate at compile time.',
      ),
    color: z
      .string()
      .optional()
      .describe(
        'Cascading master color for all elements in this scope (TikZ scope `color=`). Stroke / fill / text of inner elements default to it unless individually overridden; cascades into edge labels and arrows.',
      ),
    stroke: z
      .string()
      .optional()
      .describe(
        'Cascading default stroke color for inner nodes and paths; overrides the cascading master color for the stroke channel.',
      ),
    fill: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe('Cascading default fill (CSS color or PaintSpec: gradient / pattern / image) for inner nodes and paths.'),
    strokeWidth: z
      .number()
      .optional()
      .describe('Cascading default stroke width (user units) for inner nodes and paths.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        'Cascading default whole-element opacity 0..1. Replaces (does NOT compound across nested scopes — TikZ default).',
      ),
    fillOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Cascading default fill opacity 0..1 for inner nodes and paths.'),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Cascading default stroke opacity 0..1 (TikZ `draw opacity`) for inner nodes and paths.'),
    nodeDefault: NodeDefaultSchema.optional().describe(
      'Default style applied to every node in this scope (TikZ `every node`). Flat channel, independent from the other defaults.',
    ),
    pathDefault: PathDefaultSchema.optional().describe(
      'Default style applied to every path in this scope (TikZ `every path`); arrows use the separate arrowDefault channel.',
    ),
    labelDefault: LabelDefaultSchema.optional().describe(
      'Default style applied to every label (node label + step label) in this scope (TikZ `every label`).',
    ),
    arrowDefault: ArrowDefaultSchema.optional().describe(
      'Default style applied to every arrow in this scope (TikZ `every arrow`).',
    ),
    resetStyle: z
      .union([z.boolean(), z.array(z.enum(['node', 'path', 'label', 'arrow']))])
      .optional()
      .describe(
        'Inheritance barrier: drop the outer scope cascade + every-X defaults for the listed channels (or all when true), falling back to the built-in baseline. Only cuts the scope-inheritance axis; labels / arrows still follow their host path / node resolved color (structural relation, not scope inheritance).',
      ),
    zIndex: z
      .number()
      .int()
      .finite()
      .optional()
      .describe(
        'Explicit stacking order of this scope as a whole among its sibling IR children. Higher draws on top. Applies to the scope group as a single unit in the parent; does NOT affect how children stack inside the scope. Omitted = 0 = source order.',
      ),
    clip: ClipSpecSchema.optional().describe(
      'Clip region (rect / circle / ellipse / polygon, in scope-local coords); when set, all children of this scope are clipped to it. Compiled into a renderer-agnostic ClipResource referenced via the group clipRef.',
    ),
    meta: JsonObjectSchema.optional().describe(
      'Opaque provenance metadata carried by this element (e.g. a Tier 2 lowering tagging which datum / series / layer it came from). Provenance passthrough: preserved verbatim into the Scene primitive(s) this element emits, ignored by renderers, and never interpreted by the compiler — it does not affect layout, connection, style, or bounding box. Must be a JSON object (fully serializable). Not inherited across scopes; not part of the every-X style defaults.',
    ),
    children: z
      .array(
        z.lazy(() => {
          if (!childSchemaRef) {
            throw new Error(
              'ScopeSchema: ChildSchema not registered yet; ensure scene.ts loaded',
            );
          }
          return childSchemaRef;
        }),
      )
      .describe(
        'Scope children: nested nodes / paths / coordinates / scopes. Recursive via the parent ChildSchema (registered late to break the IRChild <-> IRScope cycle).',
      ),
  })
  .describe(
    'Scope container: groups child IR elements, applies local transforms, and acts as a style-default anchor (cascading graphic state + every-X defaults + resetStyle barrier). Corresponds to TikZ `\\begin{scope}`.',
  );
