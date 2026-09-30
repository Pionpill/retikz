import type { EntityKindDefinition, EntityPredicateDefinition, EntityRoleDefinition } from './entity';
import type { RelationKindDefinition, RelationPredicateDefinition, RelationRoleDefinition } from './relation';
import type { GraphThemeStyleDefinition } from './theme';

/** 配置一组共享 Graph definitions 的运行时扩展 */
export type GraphDefinitionOptions = Readonly<{
  /**
   * 自定义 Entity role definitions
   * @default []
   */
  entityRoles?: ReadonlyArray<EntityRoleDefinition>;
  /**
   * 自定义 Entity kind definitions
   * @default []
   */
  entityKinds?: ReadonlyArray<EntityKindDefinition>;
  /**
   * 自定义 Entity predicate definitions
   * @default []
   */
  entityPredicates?: ReadonlyArray<EntityPredicateDefinition>;
  /**
   * 自定义 Relation role definitions
   * @default []
   */
  relationRoles?: ReadonlyArray<RelationRoleDefinition>;
  /**
   * 自定义 Relation kind definitions
   * @default []
   */
  relationKinds?: ReadonlyArray<RelationKindDefinition>;
  /**
   * 自定义 Relation predicate definitions
   * @default []
   */
  relationPredicates?: ReadonlyArray<RelationPredicateDefinition>;
  /**
   * 与 Core Theme style 同名的 Graph Theme definitions
   * @default []
   */
  graphThemeStyles?: ReadonlyArray<GraphThemeStyleDefinition>;
}>;
