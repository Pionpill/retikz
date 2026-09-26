import { BlockRowProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { BlockRowEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputBlockRow, WithoutInputType } from './normalize';
import { normalizeBlockRow } from './normalize';
import { createGraphProviderDependencies } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block Row embed 的 Source authoring 输入 */
export type BlockRowInputEmbedProps = WithoutInputType<InputBlockRow>;

const inputOf = (props: BlockRowInputEmbedProps): InputBlockRow => {
  return { type: 'blockRow', ...props };
};

/** Block Row Source 的 InputEmbed adapter */
export const BlockRowInputEmbedAdapter: InputEmbedAdapter<BlockRowInputEmbedProps> = {
  kind: BlockRowEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const inputChildren = 'content' in input ? undefined : input.children;
    const normalized = normalizeGraphAuthoringChildren(inputChildren ?? [], context, 'BlockRow.children');
    const dependencies = createGraphProviderDependencies(BlockRowProviderKey);
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
export const blockRow = (input: BlockRowInputEmbedProps) => createGraphInputEmbed(BlockRowEmbedKind, input, input.id);
