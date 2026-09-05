import type { JsonObject } from '@retikz/foundation';

import type { EntityKindDefinition, EntityPredicateDefinition, EntityRoleDefinition } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphEntity, IRGraphEntityDefaults } from '../../schemas';
import type { GraphAuthorLayer, GraphMemberAppearanceResolveContext } from '../theme';

/** 已校验 params 与来源 Definition 组成的 Canonical Entity predicate */
export type CanonicalEntityPredicate = Readonly<{
  definition: EntityPredicateDefinition;
  params: JsonObject;
}>;

/** Entity data resolver 的窄上下文 */
export type EntityResolveContext = Pick<
  ResolvedGraphDefinitionOptions,
  'entityRoles' | 'entityKinds' | 'entityPredicates'
>;

/** Graph Entity data 的确定内部形态 */
export type CanonicalEntity = Readonly<{
  source: IRGraphEntity;
  roleDefinition: EntityRoleDefinition;
  kindDefinition?: EntityKindDefinition;
  predicate?: CanonicalEntityPredicate;
}>;

/** Entity appearance resolver 的 Theme、definition 与继承上下文 */
export type EntityAppearanceResolveContext = GraphMemberAppearanceResolveContext;

/** Entity 作者层投影所需的 definition 与 Graph context */
export type EntityGraphLayerResolveContext = EntityResolveContext &
  Readonly<{
    layers: ReadonlyArray<GraphAuthorLayer>;
  }>;

/** Entity Theme 级联后的完整有效外观 */
export type EffectiveEntityAppearance = Readonly<IRGraphEntityDefaults>;
