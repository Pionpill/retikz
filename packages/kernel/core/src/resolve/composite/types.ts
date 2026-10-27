import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { AnyCompositeDefinition, CompositeCompileContext, CompositeEvaluationResult } from '../../contract';
import type { IRComposite } from '../../schemas';

/** 已完成 composite key 与 provider lookup 的绑定结果 */
export type CompositeBinding =
  | Readonly<{
      /** registry 中不存在对应 provider */
      kind: 'unregistered';
      /** 以 namespace.type 表示的诊断名称，不用于注册表索引 */
      key: string;
    }>
  | Readonly<{
      /** 已绑定的复合编译定义 */
      kind: 'compile';
      /** 以 namespace.type 表示的诊断名称，不用于注册表索引 */
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
      compile: (node: unknown, context: CompositeCompileContext) => CompositeEvaluationResult<JsonValue>;
      /** 可选的 artifact schema */
      artifactSchema?: ZodType<JsonValue>;
    }>;

/** registry 中已找到 provider 的 composite binding */
export type RegisteredCompositeBinding = Exclude<CompositeBinding, { kind: 'unregistered' }>;

/**
 * provider payload 已按 owner schema 解析的 composite 结果
 * @template TBinding 解析前的注册绑定类型，结果保留其身份与执行分支
 */
export type CompositeResolution<TBinding extends RegisteredCompositeBinding = RegisteredCompositeBinding> = TBinding &
  Readonly<{
    /** provider callback 消费的已解析节点 */
    node: unknown;
  }>;

/** 按 namespace、type 两级索引的 composite provider registry 只读视图 */
export type CompositeRegistry = ReadonlyMap<string, ReadonlyMap<string, AnyCompositeDefinition>>;
