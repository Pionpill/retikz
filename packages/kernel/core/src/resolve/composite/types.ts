import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { AnyCompositeDefinition, CompositeCompileContext, CompositeEvaluationResult } from '../../contract';
import type { IRComposite } from '../../schemas';

/** 复合组件定义的查找结果 */
export type CompositeBinding =
  | Readonly<{
      /** 注册表中未找到对应的组件定义 */
      kind: 'unregistered';
      /** 以 namespace.type 表示的诊断名称，不用于注册表索引 */
      key: string;
    }>
  | Readonly<{
      /** 已绑定的复合编译定义 */
      kind: 'compile';
      /** 以 namespace.type 表示的诊断名称，不用于注册表索引 */
      key: string;
      /** 组件定义的命名空间 */
      namespace: string;
      /** 组件定义的类型名称 */
      type: string;
      /** 待组件定义的 schema 解析的原始节点 */
      source: IRComposite;
      /** 组件定义声明的完整节点 schema */
      schema: ZodType;
      /** 接收已解析节点并执行编译的回调 */
      compile: (node: unknown, context: CompositeCompileContext) => CompositeEvaluationResult<JsonValue>;
      /** 用于校验组件附加产物的可选 schema */
      artifactSchema?: ZodType<JsonValue>;
    }>;

/** 已找到组件定义的绑定结果 */
export type RegisteredCompositeBinding = Exclude<CompositeBinding, { kind: 'unregistered' }>;

/**
 * 已按组件定义的 schema 解析节点后的结果
 * @template TBinding 解析前的注册绑定类型，结果保留其身份与执行分支
 */
export type CompositeResolution<TBinding extends RegisteredCompositeBinding = RegisteredCompositeBinding> = TBinding &
  Readonly<{
    /** 交给组件编译回调的已解析节点 */
    node: unknown;
  }>;

/** 按命名空间、类型名称两级索引的只读复合组件注册表 */
export type CompositeRegistry = ReadonlyMap<string, ReadonlyMap<string, AnyCompositeDefinition>>;
