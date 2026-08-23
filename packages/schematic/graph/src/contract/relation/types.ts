import type { IRJsonObject } from '@retikz/core';
import type { z } from 'zod';

import type {
  IRGraphRelationRoleTokenRecipe,
  IRGraphRelationStructureTokenOverrides,
  RelationDirectionValue,
} from '../../schemas';

/** Relation role 的主要语义、方向约束与完整基础展示定义 */
export type RelationRoleDefinition = Readonly<{
  /** 开放的 Relation role key */
  role: string;
  /** 面向作者与工具的稳定语义说明 */
  description: string;
  /** 省略 Source direction 时使用的有效方向 */
  defaultDirection: RelationDirectionValue;
  /** role 允许的全部有效方向 */
  allowedDirections: ReadonlyArray<RelationDirectionValue>;
  /** 每个允许方向对应的完整结构 recipe */
  directions: Readonly<Partial<Record<RelationDirectionValue, IRGraphRelationRoleTokenRecipe>>>;
}>;

/** Relation kind 的稳定子类型、方向收窄与稀疏展示定义 */
export type RelationKindDefinition = Readonly<{
  /** 全局唯一的开放 Relation kind key */
  kind: string;
  /** kind 所属的 Relation role */
  role: string;
  /** 面向作者与工具的稳定语义说明 */
  description: string;
  /** kind 覆盖的默认方向 */
  defaultDirection?: RelationDirectionValue;
  /** kind 对所属 role 方向集合的非空收窄 */
  allowedDirections?: ReadonlyArray<RelationDirectionValue>;
  /** 按有效方向提供的稀疏结构 delta */
  directions?: Readonly<Partial<Record<RelationDirectionValue, IRGraphRelationStructureTokenOverrides>>>;
}>;

/** Relation predicate 作者侧的类型安全定义 */
export type RelationPredicateDefinitionInput<TSchema extends z.ZodType<IRJsonObject>> = Readonly<{
  /** 全局唯一的 predicate definition name */
  name: string;
  /** predicate 所属的 Relation role */
  role: string;
  /** 可选允许的 Relation kind keys；省略表示该 role 的全部 kind */
  kinds?: ReadonlyArray<string>;
  /** 面向作者与工具的稳定语义说明 */
  description: string;
  /** Source params 的 JSON object schema */
  paramsSchema: TSchema;
  /** 根据已校验 Canonical params 解析稀疏结构 delta */
  resolveStructure?: (params: z.output<TSchema>) => IRGraphRelationStructureTokenOverrides;
}>;

/** Relation predicate registry 保存的参数擦除定义 */
export type RelationPredicateDefinition = RelationPredicateDefinitionInput<z.ZodType<IRJsonObject>>;
