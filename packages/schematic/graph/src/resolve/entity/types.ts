import type { JsonObject } from '@retikz/foundation';

import type { EntityKindDefinition, EntityPredicateDefinition, EntityRoleDefinition } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphEntity, IRGraphEntityDefaults } from '../../schemas';
import type { GraphAuthorLayer, GraphMemberAppearanceResolveContext } from '../theme';

/** 已校验 params 与来源 Definition 组成的 Canonical Entity predicate */
export type CanonicalEntityPredicate = Readonly<{
  /** 当前实体匹配的 predicate 定义 */
  definition: EntityPredicateDefinition;
  /** 经定义 schema 校验后的 predicate 参数 */
  params: JsonObject;
}>;

/** Entity data resolver 的窄上下文 */
export type EntityResolveContext = Pick<
  ResolvedGraphDefinitionOptions,
  'entityRoles' | 'entityKinds' | 'entityPredicates'
>;

/** Graph Entity data 的确定内部形态 */
export type CanonicalEntity = Readonly<{
  /** 当前实体的 Graph IR 输入 */
  source: IRGraphEntity;
  /** 当前实体采用的角色定义 */
  roleDefinition: EntityRoleDefinition;
  /** 当前实体可选的种类定义 */
  kindDefinition?: EntityKindDefinition;
  /** 当前实体可选的 predicate 定义及已校验参数 */
  predicate?: CanonicalEntityPredicate;
}>;

/** Entity appearance resolver 的 Theme、definition 与继承上下文 */
export type EntityAppearanceResolveContext = GraphMemberAppearanceResolveContext;

/** Entity 作者层投影所需的 definition 与 Graph context */
export type EntityGraphLayerResolveContext = EntityResolveContext &
  Readonly<{
    /** 按继承顺序排列的 Graph 作者配置层 */
    layers: ReadonlyArray<GraphAuthorLayer>;
  }>;

/** Entity Theme 级联后的完整有效外观 */
export type EffectiveEntityAppearance = Readonly<IRGraphEntityDefaults>;
