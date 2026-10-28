import { blockHeaderProviderKey } from '@retikz/graph';
import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { blockHeaderEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputBlockHeader, InputGraphChild, WithoutInputType } from './normalize';
import { normalizeBlockHeader } from './normalize';
import { createGraphProviderDependencies } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block Header embed 的 Source authoring 输入 */
export type BlockHeaderInputEmbedProps = WithoutInputType<InputBlockHeader>;

/** Block Header Source 的 InputEmbed adapter */
export const blockHeaderInputEmbedAdapter: SynchronousInputEmbedAdapter<BlockHeaderInputEmbedProps> = {
  kind: blockHeaderEmbedKind,
  lower: (props, context) => {
    const inputOf = (inputProps: BlockHeaderInputEmbedProps): InputBlockHeader => {
      return { type: 'blockHeader', ...inputProps };
    };

    const input = inputOf(props);
    const slots: Array<InputGraphChild> = [];
    if (input.icon !== undefined) slots.push(input.icon);
    if (input.trail !== undefined) slots.push(input.trail);
    const normalized = normalizeGraphAuthoringChildren(slots, context, 'BlockHeader slots');
    const trailIndex = input.icon === undefined ? 0 : 1;
    const dependencies = createGraphProviderDependencies(blockHeaderProviderKey);

    return {
      node: normalizeBlockHeader({
        ...input,
        ...(input.icon === undefined ? {} : { icon: normalized.children[0] }),
        ...(input.trail === undefined ? {} : { trail: normalized.children[trailIndex] }),
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
export const blockHeader = (input: BlockHeaderInputEmbedProps) =>
  createGraphInputEmbed(blockHeaderEmbedKind, input, undefined);
