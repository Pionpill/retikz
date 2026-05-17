import { z } from 'zod';
import type { IRCoordinate } from './coordinate';
import type { IRNode } from './node';
import type { IRPath } from './path';
import { type IRTransform, TransformSchema } from './transform';

/**
 * Scope IR 类型——手写而非 z.infer 派生
 * @description ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union
 */
export type IRScope = {
  type: 'scope';
  id?: string;
  localNamespace?: boolean;
  transforms?: Array<IRTransform>;
  children: Array<IRNode | IRPath | IRCoordinate | IRScope>;
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
 * Scope schema：4 IRScope 字段
 * @description 直接 `z.object` 让 ChildSchema discriminatedUnion 能识别 `type` 鉴别字段；
 * children 字段内部用 z.lazy 引用 ChildSchema 实现递归，避免直接 `z.lazy(() => z.object(...))` 让外层 union 拒识 type
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
    'Scope container: groups child IR elements and applies local transforms. Corresponds to TikZ `\\begin{scope}` (with optional `local bounding box=id` when id is set, and `name prefix`-like isolation when localNamespace is true).',
  );
