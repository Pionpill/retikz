import type { JsonObject } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type {
  EntityKindDefinition,
  EntityPredicateDefinition,
  EntityPredicateDefinitionInput,
  EntityRoleDefinition,
} from './types';

/**
 * 定义一个可注册的 Entity role
 * @param definition 传给 GraphDefinitionOptions.entityRoles 的定义；此函数不执行注册或校验
 * @returns 原样返回 definition，不复制或修改输入对象
 */
export const defineEntityRole = (definition: EntityRoleDefinition): EntityRoleDefinition => definition;

/**
 * 定义一个可注册的 Entity kind
 * @param definition 传给 GraphDefinitionOptions.entityKinds 的定义；此函数不执行注册或校验
 * @returns 原样返回 definition，不复制或修改输入对象
 */
export const defineEntityKind = (definition: EntityKindDefinition): EntityKindDefinition => definition;

/**
 * 定义一个类型安全并可注册的 Entity predicate
 * @template TSchema 约束 paramsSchema 的 JSON 对象 Schema 类型，决定 predicate 参数的解析契约
 * @param definition 传给 GraphDefinitionOptions.entityPredicates 的定义；此函数不执行注册或校验
 * @returns 原样返回 definition，不复制或修改输入对象
 */
export const defineEntityPredicate = <TSchema extends ZodType<JsonObject>>(
  definition: EntityPredicateDefinitionInput<TSchema>,
): EntityPredicateDefinition => definition;
