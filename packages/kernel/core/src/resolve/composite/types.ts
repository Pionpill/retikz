import type { ZodType } from 'zod';

import type {
  AnyCompositeDefinition,
  CompositeExpandContext,
  CompositeExpandResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '../../contract';
import type { IRComposite, JsonValue } from '../../schemas';

/** 已完成 composite key 与 provider lookup 的绑定结果 */
export type CompositeBinding =
  | Readonly<{
      /** registry 中不存在对应 provider */
      kind: 'unregistered';
      /** `namespace.type` provider key */
      key: string;
    }>
  | Readonly<{
      /** 无布局展开分支 */
      kind: 'expand';
      /** `namespace.type` provider key */
      key: string;
      /** provider 定义的 namespace */
      namespace: string;
      /** provider 定义的 type */
      type: string;
      /** 待 provider schema 解析的 Source IR */
      source: IRComposite;
      /** provider 声明的完整节点 schema */
      schema: ZodType;
      /** schema 解析后可执行的展开 callback */
      expand: (node: unknown, context: CompositeExpandContext) => CompositeExpandResult;
    }>
  | Readonly<{
      /** layout-aware compile 分支 */
      kind: 'compile';
      /** `namespace.type` provider key */
      key: string;
      /** provider 定义的 namespace */
      namespace: string;
      /** provider 定义的 type */
      type: string;
      /** 待 provider schema 解析的 Source IR */
      source: IRComposite;
      /** provider 声明的完整节点 schema */
      schema: ZodType;
      /** schema 解析后可执行的编译 callback */
      compile: (node: unknown, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<JsonValue>;
      /** 可选的 artifact schema */
      artifactSchema?: ZodType<JsonValue>;
    }>;

/** registry 中已找到 provider 的 composite binding */
export type RegisteredCompositeBinding = Exclude<CompositeBinding, { kind: 'unregistered' }>;

/** provider payload 已按 owner schema 解析的 composite 结果 */
export type CompositeResolution<TBinding extends RegisteredCompositeBinding = RegisteredCompositeBinding> = TBinding &
  Readonly<{
    /** provider callback 消费的已解析节点 */
    node: unknown;
  }>;

/** composite provider registry 只读视图 */
export type CompositeRegistry = ReadonlyMap<string, AnyCompositeDefinition>;
