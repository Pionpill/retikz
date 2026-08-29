import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter, InputEmbedContext, NormalizedInputEmbedChildren } from '@retikz/vanilla';

import { GroupProviderKey } from '@retikz/graph';

import type { InputEntity, InputGroup, InputGroupChild, InputRelation } from './normalize';

import { GroupEmbedKind } from './constants';
import { RetikzGraphVanillaError, RetikzGraphVanillaErrorCode } from './errors';
import { normalizeGroup } from './normalize';
import { createGraphProviderDependencies, graphDefinitionOptionsOf } from './providers';

/** Group embed 同时携带 Source authoring 输入与当前 definition options */
export type GroupInputEmbedProps = InputGroup & GraphDefinitionOptions;

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
  return input;
};

const isGroupMemberInput = (child: InputGroupChild): child is InputEntity | InputRelation =>
  !('namespace' in child) && (child.type === 'entity' || child.type === 'relation');

const isGroupContentInput = (child: InputGroupChild): child is Exclude<InputGroupChild, InputEntity | InputRelation> =>
  !isGroupMemberInput(child);

const normalizeChildren = (
  input: InputGroup,
  context: InputEmbedContext,
): Readonly<{ input: InputGroup; nested?: NormalizedInputEmbedChildren }> => {
  const children = input.children ?? [];
  const authoredChildren = children.filter(isGroupContentInput);
  if (authoredChildren.length === 0) return { input };
  if (context.normalizeChildren === undefined) {
    throw new RetikzGraphVanillaError({
      code: RetikzGraphVanillaErrorCode.NormalizeSceneRequired,
      message: 'Group content authoring requires a normalizeScene embed context.',
      details: { label: 'Group.children' },
    });
  }
  const nested = context.normalizeChildren(authoredChildren);
  let contentCursor = 0;
  return {
    input: {
      ...input,
      children: children.map(child => (isGroupMemberInput(child) ? child : nested.children[contentCursor++])),
    },
    nested,
  };
};

/** Group Source 的 InputEmbed adapter */
export const GroupInputEmbedAdapter: InputEmbedAdapter<GroupInputEmbedProps> = {
  kind: GroupEmbedKind,
  lower: (props, context) => {
    const normalized = normalizeChildren(inputOf(props), context);
    const dependencies = createGraphProviderDependencies(GroupProviderKey, graphDefinitionOptionsOf(props));
    return {
      node: normalizeGroup(normalized.input),
      providerDependencies: {
        roots: [...dependencies.roots, ...(normalized.nested?.providerDependencies.roots ?? [])],
        providers: [...dependencies.providers, ...(normalized.nested?.providerDependencies.providers ?? [])],
      },
      ...(normalized.nested === undefined ? {} : { authoringSites: normalized.nested.authoringSites }),
    };
  },
};

/** 创建 Group Source 的 authoring embed 节点 */
export const group = (id: string, input: GroupInputEmbedProps): InputEmbed<GroupInputEmbedProps> => ({
  type: 'embed',
  kind: GroupEmbedKind,
  id,
  props: input,
});
