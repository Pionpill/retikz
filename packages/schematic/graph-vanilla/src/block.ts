import { BlockProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { BlockEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputBlock, WithoutInputType } from './normalize';
import { normalizeBlock } from './normalize';
import { createGraphProviderDependencies } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block embed 的 Source authoring 输入 */
export type BlockInputEmbedProps = WithoutInputType<InputBlock>;

const inputOf = (props: BlockInputEmbedProps): InputBlock => {
  return { type: 'block', ...props };
};

/** Block Source 的 InputEmbed adapter */
export const BlockInputEmbedAdapter: InputEmbedAdapter<BlockInputEmbedProps> = {
  kind: BlockEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'Block.children');
    const dependencies = createGraphProviderDependencies(BlockProviderKey);
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
export const block = (input: BlockInputEmbedProps) => createGraphInputEmbed(BlockEmbedKind, input, input.id);
