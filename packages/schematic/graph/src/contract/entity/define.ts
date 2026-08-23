import type { IRJsonObject } from '@retikz/core';
import type { z } from 'zod';

import type {
  EntityKindDefinition,
  EntityPredicateDefinition,
  EntityPredicateDefinitionInput,
  EntityRoleDefinition,
} from './types';

/** 定义一个可注册的 Entity role */
export const defineEntityRole = (definition: EntityRoleDefinition): EntityRoleDefinition => definition;

/** 定义一个可注册的 Entity kind */
export const defineEntityKind = (definition: EntityKindDefinition): EntityKindDefinition => definition;

/** 定义一个类型安全并可注册的 Entity predicate */
export const defineEntityPredicate = <TSchema extends z.ZodType<IRJsonObject>>(
  definition: EntityPredicateDefinitionInput<TSchema>,
): EntityPredicateDefinition => definition;
