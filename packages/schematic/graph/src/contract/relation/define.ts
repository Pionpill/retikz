import type { JsonObject } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type {
  RelationKindDefinition,
  RelationPredicateDefinition,
  RelationPredicateDefinitionInput,
  RelationRoleDefinition,
} from './types';

/**
 * 定义一个可注册的 Relation role
 * @param definition 传给 GraphDefinitionOptions.relationRoles 的定义；此函数不执行注册或校验
 * @returns 原样返回 definition，不复制或修改输入对象
 */
export const defineRelationRole = (definition: RelationRoleDefinition): RelationRoleDefinition => definition;

/**
 * 定义一个可注册的 Relation kind
 * @param definition 传给 GraphDefinitionOptions.relationKinds 的定义；此函数不执行注册或校验
 * @returns 原样返回 definition，不复制或修改输入对象
 */
export const defineRelationKind = (definition: RelationKindDefinition): RelationKindDefinition => definition;

/**
 * 定义一个类型安全并可注册的 Relation predicate
 * @typeParam TSchema 约束 paramsSchema 的 JSON 对象 Schema 类型，决定 predicate 参数的解析契约
 * @param definition 传给 GraphDefinitionOptions.relationPredicates 的定义；此函数不执行注册或校验
 * @returns 原样返回 definition，不复制或修改输入对象
 */
export const defineRelationPredicate = <TSchema extends ZodType<JsonObject>>(
  definition: RelationPredicateDefinitionInput<TSchema>,
): RelationPredicateDefinition => definition as unknown as RelationPredicateDefinition;
