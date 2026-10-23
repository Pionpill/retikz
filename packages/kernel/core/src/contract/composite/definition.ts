import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject, ZodUnion } from 'zod';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CompositeCompileContext, CompositeEvaluationResult } from './layout';

/**
 * 复合组件统一注册契约
 * @template TNode 经 schema 解析的组件声明
 * @template TNamespace 注册命名空间
 * @template TType 注册类型
 * @template TArtifact JSON 编译产物类型，默认不声明产物
 */
export type CompositeDefinition<
  TNode,
  TNamespace extends string = string,
  TType extends string = string,
  TArtifact extends JsonValue = never,
> = {
  /** 注册命名空间 */
  namespace: TNamespace;
  /** 注册类型 */
  type: TType;
  /** 完整组件声明的 schema */
  schema: ZodType<TNode>;
  /** 在完整编译上下文中生成子项，布局能力按需调用 */
  compile: (node: TNode, context: CompositeCompileContext) => CompositeEvaluationResult<TArtifact>;
} & ([TArtifact] extends [never] ? { artifactSchema?: never } : { artifactSchema: ZodType<TArtifact> });

/** registry 与 adapter 使用的异构复合定义，调用前恢复节点类型关联 */
export type AnyCompositeDefinition = {
  /** 注册命名空间 */
  namespace: string;
  /** 注册类型 */
  type: string;
  /** 完整组件声明的 schema */
  schema: ZodType;
} & (
  | {
      /** 生成当前组件的编译输出 */
      compile: (node: never, context: CompositeCompileContext) => CompositeEvaluationResult<never>;
      artifactSchema?: never;
    }
  | {
      /** 生成当前组件的编译输出与可选产物 */
      compile: (node: never, context: CompositeCompileContext) => CompositeEvaluationResult<JsonValue>;
      /** JSON 产物的类型契约；回调输出不重复执行 Schema 解析 */
      artifactSchema: ZodType<JsonValue>;
    }
);

/** 把 composite registration schema 规范化为可读取 provider key 的对象分支 */
const resolveObjectSchemas = (schema: ZodType): Array<ZodObject> => {
  if (schema instanceof ZodObject) return [schema];
  if (!(schema instanceof ZodUnion)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'defineComposite: schema must be a ZodObject or a ZodUnion of ZodObject variants extending CompositeBaseSchema.',
    );
  }

  if (schema.options.length === 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'defineComposite: schema union must contain at least one ZodObject option.',
    );
  }

  return schema.options.map((option, index) => {
    if (!(option instanceof ZodObject)) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `defineComposite: schema union option ${index} must be a ZodObject extending CompositeBaseSchema.`,
      );
    }

    return option;
  });
};

/** 从 composite 对象分支中读取并校验共同 namespace / type literal */
const resolveLiteralValue = (schema: ZodType, field: 'namespace' | 'type'): string => {
  const objects = resolveObjectSchemas(schema);
  const values = objects.map((object, index) => {
    const node = object.shape[field];
    const path = objects.length === 1 ? `schema.${field}` : `schema union option ${index}.${field}`;
    const message = `defineComposite: ${path} must be a z.literal string.`;
    if (!(node instanceof ZodLiteral) || typeof node.value !== 'string') {
      throw new RetikzCoreError(RetikzCoreErrorCode.Contract, message);
    }

    return node.value;
  });
  const expected = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value !== expected) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `defineComposite: schema union option ${index} ${field} literal "${value}" does not match option 0 literal "${expected}".`,
      );
    }
  }

  return expected;
};

/**
 * 定义 Tier 2 composite 注册项
 * @remarks 保留精确 key、节点、artifact 与编译回调，并校验 definition key 与 schema literal 一致
 * @template TNamespace 复合组件注册命名空间的字面量类型
 * @template TType 复合组件注册类型的字面量类型
 * @template TNode schema 解析后传入组件执行回调的节点类型
 * @template TArtifact 组件产物 schema 校验的 JSON 类型，默认 never 表示未声明产物
 * @template TDefinition 保留具体编译回调及扩展字段的完整定义类型
 */
export const defineComposite = <
  const TNamespace extends string,
  const TType extends string,
  TNode,
  TArtifact extends JsonValue = never,
  const TDefinition extends CompositeDefinition<TNode, TNamespace, TType, TArtifact> = CompositeDefinition<
    TNode,
    TNamespace,
    TType,
    TArtifact
  >,
>(
  definition: CompositeDefinition<TNode, TNamespace, TType, TArtifact> & TDefinition,
): TDefinition => {
  const namespace = resolveLiteralValue(definition.schema, 'namespace');
  const type = resolveLiteralValue(definition.schema, 'type');
  if (definition.namespace !== namespace) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `defineComposite: declared namespace "${definition.namespace}" does not match schema literal "${namespace}".`,
    );
  }

  if (definition.type !== type) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `defineComposite: declared type "${definition.type}" does not match schema literal "${type}".`,
    );
  }

  return definition;
};
