import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { CompositeCompileContext, CompositeEvaluationResult } from './layout';

/**
 * 复合组件统一注册契约
 * @template TComposite 经 schema 解析的复合组件声明
 * @template TNamespace 注册命名空间
 * @template TType 注册类型
 * @template TArtifact JSON 编译产物类型，默认不声明产物
 * @template TMemo 组件在两次编译间保留的私有数据
 */
export type CompositeDefinition<
  TComposite,
  TNamespace extends string = string,
  TType extends string = string,
  TArtifact extends JsonValue = never,
  TMemo extends object = never,
> = {
  /** 注册命名空间 */
  namespace: TNamespace;
  /** 注册类型 */
  type: TType;
  /** 完整组件声明的 schema，输出的注册键必须与定义一致 */
  schema: ZodType<TComposite> & ZodType<{ namespace: NoInfer<TNamespace>; type: NoInfer<TType> }>;
  /** 在完整编译上下文中生成子项，布局能力按需调用 */
  compile: (
    composite: TComposite,
    context: CompositeCompileContext,
    memo?: TMemo,
  ) => CompositeEvaluationResult<TArtifact, TMemo>;
} & ([TArtifact] extends [never] ? { artifactSchema?: never } : { artifactSchema: ZodType<TArtifact> });

/** 注册表擦除各组件的私有输入类型，保留回调返回值与产物声明的关联 */
type RegisteredDefinition<TArtifact extends JsonValue> = Omit<
  CompositeDefinition<never, string, string, TArtifact>,
  'schema' | 'compile'
> & {
  schema: ZodType;
  compile: (ir: never, context: CompositeCompileContext, memo?: never) => CompositeEvaluationResult<TArtifact, object>;
};

/** registry 与 adapter 使用的异构复合定义 */
export type AnyCompositeDefinition = RegisteredDefinition<never> | RegisteredDefinition<JsonValue>;

/**
 * 定义 Tier 2 composite 注册项
 * @remarks 保留精确 key、复合组件声明、artifact 与编译回调；注册键一致性由类型约束，定义时不执行运行时校验
 * @template TNamespace 复合组件注册命名空间的字面量类型
 * @template TType 复合组件注册类型的字面量类型
 * @template TComposite schema 解析后传入编译回调的复合组件声明类型
 * @template TArtifact 组件产物 schema 校验的 JSON 类型，默认 never 表示未声明产物
 * @template TMemo 组件在两次编译间保留的私有数据
 * @template TDefinition 保留具体编译回调及扩展字段的完整定义类型
 */
export const defineComposite = <
  const TNamespace extends string,
  const TType extends string,
  TComposite,
  TArtifact extends JsonValue = never,
  TMemo extends object = never,
  const TDefinition extends CompositeDefinition<TComposite, TNamespace, TType, TArtifact, TMemo> = CompositeDefinition<
    TComposite,
    TNamespace,
    TType,
    TArtifact,
    TMemo
  >,
>(
  definition: CompositeDefinition<TComposite, TNamespace, TType, TArtifact, TMemo> & TDefinition,
): TDefinition => definition;
