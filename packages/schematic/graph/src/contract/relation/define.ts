import type { IRJsonObject } from '@retikz/core';
import type { ZodType } from 'zod';

import type {
  RelationKindDefinition,
  RelationPredicateDefinition,
  RelationPredicateDefinitionInput,
  RelationRoleDefinition,
} from './types';

/** 定义一个可注册的 Relation role */
export const defineRelationRole = (definition: RelationRoleDefinition): RelationRoleDefinition => definition;

/** 定义一个可注册的 Relation kind */
export const defineRelationKind = (definition: RelationKindDefinition): RelationKindDefinition => definition;

/** 定义一个类型安全并可注册的 Relation predicate */
export const defineRelationPredicate = <TSchema extends ZodType<IRJsonObject>>(
  definition: RelationPredicateDefinitionInput<TSchema>,
): RelationPredicateDefinition => definition as unknown as RelationPredicateDefinition;
