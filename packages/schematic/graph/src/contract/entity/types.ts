import type { IRJsonObject, IRNode } from '@retikz/core';
import type { ZodType } from 'zod';

/** Entity role 的语义与完整基础结构定义 */
export type EntityRoleDefinition = Readonly<{
  /** 开放的 Entity role key */
  role: string;
  /** 面向作者与工具的稳定语义说明 */
  description: string;
  /** role 独占的 Core Node shape */
  shape: NonNullable<IRNode['shape']>;
  /** 可选边界定义 */
  boundary?: IRNode['boundary'];
  /** role 独占的基础内边距 */
  padding: NonNullable<IRNode['padding']>;
  /** 可选圆角半径 */
  cornerRadius?: IRNode['cornerRadius'];
  /** 可选基础最小尺寸 */
  minimumSize?: IRNode['minimumSize'];
}>;

/** Entity kind 的稳定语义子类型定义 */
export type EntityKindDefinition = Readonly<{
  /** 全局唯一的开放 Entity kind key */
  kind: string;
  /** kind 所属的 Entity role */
  role: string;
  /** 面向作者与工具的稳定语义说明 */
  description: string;
}>;

/** Entity predicate 作者侧的类型安全定义 */
export type EntityPredicateDefinitionInput<TSchema extends ZodType<IRJsonObject>> = Readonly<{
  /** 全局唯一的 predicate definition name */
  name: string;
  /** predicate 所属的 Entity role */
  role: string;
  /** 可选允许的 Entity kind keys；省略表示该 role 的全部 kind */
  kinds?: ReadonlyArray<string>;
  /** 面向作者与工具的稳定语义说明 */
  description: string;
  /** Source params 的 JSON object schema */
  paramsSchema: TSchema;
}>;

/** Entity predicate registry 保存的参数擦除定义 */
export type EntityPredicateDefinition = EntityPredicateDefinitionInput<ZodType<IRJsonObject>>;
