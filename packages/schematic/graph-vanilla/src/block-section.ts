import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { BlockSectionProviderKey } from '@retikz/graph';

import type { InputBlockSection } from './normalize';

import { BlockSectionEmbedKind } from './constants';
import { normalizeBlockSection } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block Section embed 同时携带 Source authoring 输入与当前 definition options */
export type BlockSectionInputEmbedProps = InputBlockSection & GraphDefinitionOptions;

const inputOf = (props: BlockSectionInputEmbedProps): InputBlockSection => {
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

/** Block Section Source 的 InputEmbed adapter */
export const BlockSectionInputEmbedAdapter: InputEmbedAdapter<BlockSectionInputEmbedProps> = {
  kind: BlockSectionEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'BlockSection.children');
    const dependencies = createGraphProviderDependencies(BlockSectionProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeBlockSection({
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

/** 创建 Block Section Source 的 authoring embed 节点 */
export const blockSection = (
  id: string,
  input: BlockSectionInputEmbedProps,
): InputEmbed<BlockSectionInputEmbedProps> => ({
  type: 'embed',
  kind: BlockSectionEmbedKind,
  id,
  props: input,
});
