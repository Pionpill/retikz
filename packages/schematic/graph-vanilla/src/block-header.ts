import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { BlockHeaderProviderKey } from '@retikz/graph';

import type { InputBlockHeader, InputGraphChild } from './normalize';

import { BlockHeaderEmbedKind } from './constants';
import { normalizeBlockHeader } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block Header embed 同时携带 Source authoring 输入与当前 definition options */
export type BlockHeaderInputEmbedProps = InputBlockHeader & GraphDefinitionOptions;

const inputOf = (props: BlockHeaderInputEmbedProps): InputBlockHeader => {
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

/** Block Header Source 的 InputEmbed adapter */
export const BlockHeaderInputEmbedAdapter: InputEmbedAdapter<BlockHeaderInputEmbedProps> = {
  kind: BlockHeaderEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const slots: Array<InputGraphChild> = [];
    if (input.icon !== undefined) slots.push(input.icon);
    if (input.trailing !== undefined) slots.push(input.trailing);
    const normalized = normalizeGraphAuthoringChildren(slots, context, 'BlockHeader slots');
    const trailingIndex = input.icon === undefined ? 0 : 1;
    const dependencies = createGraphProviderDependencies(BlockHeaderProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeBlockHeader({
        ...input,
        ...(input.icon === undefined ? {} : { icon: normalized.children[0] }),
        ...(input.trailing === undefined ? {} : { trailing: normalized.children[trailingIndex] }),
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

/** 创建 Block Header Source 的 authoring embed 节点 */
export const blockHeader = (id: string, input: BlockHeaderInputEmbedProps): InputEmbed<BlockHeaderInputEmbedProps> => ({
  type: 'embed',
  kind: BlockHeaderEmbedKind,
  id,
  props: input,
});
