import type { JsonObject } from '@retikz/foundation';

import type { RelationKindDefinition, RelationPredicateDefinition, RelationRoleDefinition } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphRelation, IRGraphRelationDefaults, RelationDirectionValue } from '../../schemas';
import type { IRGraphRelationRoleTokenRecipe } from '../../schemas';
import type { GraphAuthorLayer, GraphMemberAppearanceResolveContext } from '../theme';

/** 已校验 params 与来源 Definition 组成的 Canonical Relation predicate */
export type CanonicalRelationPredicate = Readonly<{
  definition: RelationPredicateDefinition;
  params: JsonObject;
}>;

/** Relation data resolver 的窄上下文 */
export type RelationResolveContext = Pick<
  ResolvedGraphDefinitionOptions,
  'relationRoles' | 'relationKinds' | 'relationPredicates'
>;

/** Graph Relation data 的确定内部形态 */
export type CanonicalRelation = Readonly<{
  source: IRGraphRelation;
  roleDefinition: RelationRoleDefinition;
  kindDefinition?: RelationKindDefinition;
  predicate?: CanonicalRelationPredicate;
  effectiveDirection: RelationDirectionValue;
}>;

/** Relation appearance resolver 的 Theme 与 definition 上下文 */
export type RelationAppearanceResolveContext = GraphMemberAppearanceResolveContext;

/** Relation 作者层投影所需的 definition 与 Graph context */
export type RelationGraphLayerResolveContext = RelationResolveContext &
  Readonly<{
    layers: ReadonlyArray<GraphAuthorLayer>;
  }>;

/** Relation role、kind 与 predicate 解析后的完整结构 */
export type EffectiveRelationStructure = IRGraphRelationRoleTokenRecipe;

/** Relation Theme 级联后的完整有效外观 */
export type EffectiveRelationAppearance = Readonly<IRGraphRelationDefaults>;
