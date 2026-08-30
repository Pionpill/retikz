import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { GraphProviderKey } from '@retikz/graph';

import type { InputGraph } from './normalize';

import { GraphEmbedKind } from './constants';
import { normalizeGraph } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Graph embed 同时携带 Source authoring 输入与当前 definition options */
export type GraphInputEmbedProps = InputGraph & GraphDefinitionOptions;

const inputOf = (props: GraphInputEmbedProps): InputGraph => {
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

/** Graph Source root 的 InputEmbed adapter */
export const GraphInputEmbedAdapter: InputEmbedAdapter<GraphInputEmbedProps> = {
  kind: GraphEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'Graph.children');
    const dependencies = createGraphProviderDependencies(GraphProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeGraph({
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

/** 创建 Graph Source root 的 authoring embed 节点 */
export const graph = (id: string, input: GraphInputEmbedProps): InputEmbed<GraphInputEmbedProps> => ({
  type: 'embed',
  kind: GraphEmbedKind,
  id,
  props: input,
});
