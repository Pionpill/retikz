import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter, InputEmbedContext, NormalizedInputEmbedChildren } from '@retikz/vanilla';

import { GraphProviderKey } from '@retikz/graph';

import type { InputEntity, InputGraph, InputGraphChild, InputRelation } from './normalize';

import { GraphEmbedKind } from './constants';
import { RetikzGraphVanillaError, RetikzGraphVanillaErrorCode } from './errors';
import { normalizeGraph } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';

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

const isGraphMemberInput = (child: InputGraphChild): child is InputEntity | InputRelation =>
  !('namespace' in child) && (child.type === 'entity' || child.type === 'relation');

const isGraphContentInput = (child: InputGraphChild): child is Exclude<InputGraphChild, InputEntity | InputRelation> =>
  !isGraphMemberInput(child);

const normalizeChildren = (
  input: InputGraph,
  context: InputEmbedContext,
): Readonly<{ input: InputGraph; nested?: NormalizedInputEmbedChildren }> => {
  const children = input.children ?? [];
  const authoredChildren = children.filter(isGraphContentInput);
  if (authoredChildren.length === 0) return { input };
  if (context.normalizeChildren === undefined) {
    throw new RetikzGraphVanillaError({
      code: RetikzGraphVanillaErrorCode.NormalizeSceneRequired,
      message: 'Graph content authoring requires a normalizeScene embed context.',
      details: { label: 'Graph.children' },
    });
  }

  const nested = context.normalizeChildren(authoredChildren);
  let contentCursor = 0;
  return {
    input: {
      ...input,
      children: children.map(child => (isGraphMemberInput(child) ? child : nested.children[contentCursor++])),
    },
    nested,
  };
};

/** Graph Source root 的 InputEmbed adapter */
export const GraphInputEmbedAdapter: InputEmbedAdapter<GraphInputEmbedProps> = {
  kind: GraphEmbedKind,
  lower: (props, context) => {
    const normalized = normalizeChildren(inputOf(props), context);
    const dependencies = createGraphProviderDependencies(GraphProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeGraph(normalized.input),
      providerDependencies: {
        roots: [...dependencies.roots, ...(normalized.nested?.providerDependencies.roots ?? [])],
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
