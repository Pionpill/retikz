import type { GraphDefinitionOptions } from '@retikz/graph';
import { GroupProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { GroupEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputGroup, WithoutInputType } from './normalize';
import { normalizeGroup } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Group embed 同时携带 Source authoring 输入与当前 definition options */
export type GroupInputEmbedProps = WithoutInputType<InputGroup> & GraphDefinitionOptions;

const inputOf = (props: GroupInputEmbedProps): InputGroup => {
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
  return { type: 'group', ...input };
};

/** Group Source 的 InputEmbed adapter */
export const GroupInputEmbedAdapter: InputEmbedAdapter<GroupInputEmbedProps> = {
  kind: GroupEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'Group.children');
    const dependencies = createGraphProviderDependencies(GroupProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeGroup({
        ...input,
        ...(input.children === undefined ? {} : { children: normalized.children }),
      }),
      providerDependencies: {
        roots: [
          ...dependencies.roots,
          ...normalized.providerRoots,
          ...(normalized.nested?.providerDependencies.roots ?? []),
        ],
        providers: [...dependencies.providers, ...(normalized.nested?.providerDependencies.providers ?? [])],
      },
      ...(normalized.nested === undefined ? {} : { authoringSites: normalized.nested.authoringSites }),
    };
  },
};

/** 创建 Group Source 的 authoring embed 节点 */
export const group = (input: GroupInputEmbedProps) => createGraphInputEmbed(GroupEmbedKind, input, input.id);
