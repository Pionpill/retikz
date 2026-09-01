import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { BlockRowProviderKey } from '@retikz/graph';

import type { InputBlockRow } from './normalize';

import { BlockRowEmbedKind } from './constants';
import { normalizeBlockRow } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block Row embed 同时携带 Source authoring 输入与当前 definition options */
export type BlockRowInputEmbedProps = InputBlockRow & GraphDefinitionOptions;

const inputOf = (props: BlockRowInputEmbedProps): InputBlockRow => {
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

/** Block Row Source 的 InputEmbed adapter */
export const BlockRowInputEmbedAdapter: InputEmbedAdapter<BlockRowInputEmbedProps> = {
  kind: BlockRowEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const inputChildren = 'content' in input ? undefined : input.children;
    const normalized = normalizeGraphAuthoringChildren(inputChildren ?? [], context, 'BlockRow.children');
    const dependencies = createGraphProviderDependencies(BlockRowProviderKey, graphDefinitionOptionsOf(props));
    let node: ReturnType<typeof normalizeBlockRow>;
    if (input.content !== undefined || inputChildren === undefined) {
      node = normalizeBlockRow(input);
    } else {
      const { content: _content, ...row } = input;
      void _content;
      node = normalizeBlockRow({
        ...row,
        children: normalized.children,
      });
    }
    return {
      node,
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

/** 创建 Block Row Source 的 authoring embed 节点 */
export const blockRow = (id: string, input: BlockRowInputEmbedProps): InputEmbed<BlockRowInputEmbedProps> => ({
  type: 'embed',
  kind: BlockRowEmbedKind,
  id,
  props: input,
});
