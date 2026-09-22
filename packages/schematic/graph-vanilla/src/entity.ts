import type { GraphDefinitionOptions } from '@retikz/graph';
import { EntityProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { EntityEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputEntity, WithoutInputType } from './normalize';
import { normalizeEntity } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';

/** Entity embed 同时携带 Source authoring 输入与当前 definition options */
export type EntityInputEmbedProps = WithoutInputType<InputEntity> & GraphDefinitionOptions;

const inputOf = (props: EntityInputEmbedProps): InputEntity => {
  const {
    entityRoles: _entityRoles,
    entityKinds: _entityKinds,
    entityPredicates: _entityPredicates,
    relationRoles: _relationRoles,
    relationKinds: _relationKinds,
    relationPredicates: _relationPredicates,
    graphThemeStyles: _graphThemeStyles,
    ...input
  } = props;
  void _entityRoles;
  void _entityKinds;
  void _entityPredicates;
  void _relationRoles;
  void _relationKinds;
  void _relationPredicates;
  void _graphThemeStyles;
  return { type: 'entity', ...input };
};

/** Entity Source 的 InputEmbed adapter */
export const EntityInputEmbedAdapter: InputEmbedAdapter<EntityInputEmbedProps> = {
  kind: EntityEmbedKind,
  lower: props => ({
    node: normalizeEntity(inputOf(props)),
    providerDependencies: createGraphProviderDependencies(EntityProviderKey, graphDefinitionOptionsOf(props)),
  }),
};

/** 创建 Entity Source 的 authoring embed 节点 */
export const entity = (input: EntityInputEmbedProps) => createGraphInputEmbed(EntityEmbedKind, input, input.id);
