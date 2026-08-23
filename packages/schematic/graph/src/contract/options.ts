import type { EntityKindDefinition, EntityPredicateDefinition, EntityRoleDefinition } from './entity';
import type { RelationKindDefinition, RelationPredicateDefinition, RelationRoleDefinition } from './relation';
import type { GraphThemeStyleDefinition } from './theme';

/** 配置一组共享 Graph definitions 的运行时扩展 */
export type GraphDefinitionOptions = Readonly<{
  /** 自定义 Entity role definitions */
  entityRoles?: ReadonlyArray<EntityRoleDefinition>;
  /** 自定义 Entity kind definitions */
  entityKinds?: ReadonlyArray<EntityKindDefinition>;
  /** 自定义 Entity predicate definitions */
  entityPredicates?: ReadonlyArray<EntityPredicateDefinition>;
  /** 自定义 Relation role definitions */
  relationRoles?: ReadonlyArray<RelationRoleDefinition>;
  /** 自定义 Relation kind definitions */
  relationKinds?: ReadonlyArray<RelationKindDefinition>;
  /** 自定义 Relation predicate definitions */
  relationPredicates?: ReadonlyArray<RelationPredicateDefinition>;
  /** 与 Core Theme style 同名的 Graph Theme definitions */
  graphThemeStyles?: ReadonlyArray<GraphThemeStyleDefinition>;
}>;
