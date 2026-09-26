import { GroupProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { GroupEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputGroup, WithoutInputType } from './normalize';
import { normalizeGroup } from './normalize';
import { createGraphProviderDependencies } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Group embed 的 Source authoring 输入 */
export type GroupInputEmbedProps = WithoutInputType<InputGroup>;

const inputOf = (props: GroupInputEmbedProps): InputGroup => {
  return { type: 'group', ...props };
};

/** Group Source 的 InputEmbed adapter */
export const GroupInputEmbedAdapter: InputEmbedAdapter<GroupInputEmbedProps> = {
  kind: GroupEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'Group.children');
    const dependencies = createGraphProviderDependencies(GroupProviderKey);
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
