import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { RelationProviderKey } from '@retikz/graph';

import type { InputRelation } from './normalize';

import { RelationEmbedKind } from './constants';
import { normalizeRelation } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';

/** Relation embed 同时携带 Source authoring 输入与当前 definition options */
export type RelationInputEmbedProps = InputRelation & GraphDefinitionOptions;

const inputOf = (props: RelationInputEmbedProps): InputRelation => {
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
  return input;
};

/** Relation Source 的 InputEmbed adapter */
export const RelationInputEmbedAdapter: InputEmbedAdapter<RelationInputEmbedProps> = {
  kind: RelationEmbedKind,
  lower: props => ({
    node: normalizeRelation(inputOf(props)),
    providerDependencies: createGraphProviderDependencies(RelationProviderKey, graphDefinitionOptionsOf(props)),
  }),
};

/** 创建 Relation Source 的 authoring embed 节点 */
export const relation = (id: string, input: RelationInputEmbedProps): InputEmbed<RelationInputEmbedProps> => ({
  type: 'embed',
  kind: RelationEmbedKind,
  id,
  props: input,
});
