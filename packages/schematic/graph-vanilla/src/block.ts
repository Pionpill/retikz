import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { BlockProviderKey } from '@retikz/graph';

import type { InputBlock } from './normalize';

import { BlockEmbedKind } from './constants';
import { normalizeBlock } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block embed 同时携带 Source authoring 输入与当前 definition options */
export type BlockInputEmbedProps = InputBlock & GraphDefinitionOptions;

const inputOf = (props: BlockInputEmbedProps): InputBlock => {
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

/** Block Source 的 InputEmbed adapter */
export const BlockInputEmbedAdapter: InputEmbedAdapter<BlockInputEmbedProps> = {
  kind: BlockEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'Block.children');
    const dependencies = createGraphProviderDependencies(BlockProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeBlock({
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

/** 创建 Block Source 的 authoring embed 节点 */
export const block = (id: string, input: BlockInputEmbedProps): InputEmbed<BlockInputEmbedProps> => ({
  type: 'embed',
  kind: BlockEmbedKind,
  id,
  props: input,
});
