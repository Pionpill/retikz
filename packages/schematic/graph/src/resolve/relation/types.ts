import type { JsonObject } from '@retikz/foundation';

import type { RelationKindDefinition, RelationPredicateDefinition, RelationRoleDefinition } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphRelation, IRGraphRelationDefaults, RelationDirection } from '../../schemas';
import type { IRGraphRelationRoleTokenRecipe } from '../../schemas';
import type { GraphAuthorLayer, GraphMemberAppearanceResolveContext } from '../theme';

/** 已校验 params 与来源 Definition 组成的 Canonical Relation predicate */
export type CanonicalRelationPredicate = Readonly<{
  /** 当前关系匹配的 predicate 定义 */
  definition: RelationPredicateDefinition;
  /** 经定义 schema 校验后的 predicate 参数 */
  params: JsonObject;
}>;

/** Relation data resolver 的窄上下文 */
export type RelationResolveContext = Pick<
  ResolvedGraphDefinitionOptions,
  'relationRoles' | 'relationKinds' | 'relationPredicates'
>;

/** Graph Relation data 的确定内部形态 */
export type CanonicalRelation = Readonly<{
  /** 当前关系的 Graph IR 输入 */
  source: IRGraphRelation;
  /** 当前关系采用的角色定义 */
  roleDefinition: RelationRoleDefinition;
  /** 当前关系可选的种类定义 */
  kindDefinition?: RelationKindDefinition;
  /** 当前关系可选的 predicate 定义及已校验参数 */
  predicate?: CanonicalRelationPredicate;
  /** 应用作者覆盖和角色默认值后的关系方向 */
  effectiveDirection: RelationDirection;
}>;

/** Relation appearance resolver 的 Theme 与 definition 上下文 */
export type RelationAppearanceResolveContext = GraphMemberAppearanceResolveContext;

/** Relation structure resolver 的 Theme 与 definition 上下文 */
export type RelationStructureResolveContext = GraphMemberAppearanceResolveContext;

/** Relation 作者层投影所需的 definition 与 Graph context */
export type RelationGraphLayerResolveContext = RelationResolveContext &
  Readonly<{
    /** 按继承顺序排列的 Graph 作者配置层 */
    layers: ReadonlyArray<GraphAuthorLayer>;
  }>;

/** Relation role、kind 与 predicate 解析后的完整结构 */
export type EffectiveRelationStructure = IRGraphRelationRoleTokenRecipe;

/** Relation Theme 级联后的完整有效外观 */
export type EffectiveRelationAppearance = Readonly<IRGraphRelationDefaults>;
