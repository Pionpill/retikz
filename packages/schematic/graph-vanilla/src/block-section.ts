import { BlockSectionProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { BlockSectionEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputBlockSection, WithoutInputType } from './normalize';
import { normalizeBlockSection } from './normalize';
import { createGraphProviderDependencies } from './providers';
import { normalizeGraphAuthoringChildren } from './semantic-children';

/** Block Section embed 的 Source authoring 输入 */
export type BlockSectionInputEmbedProps = WithoutInputType<InputBlockSection>;

const inputOf = (props: BlockSectionInputEmbedProps): InputBlockSection => {
  return { type: 'blockSection', ...props };
};

/** Block Section Source 的 InputEmbed adapter */
export const BlockSectionInputEmbedAdapter: InputEmbedAdapter<BlockSectionInputEmbedProps> = {
  kind: BlockSectionEmbedKind,
  lower: (props, context) => {
    const input = inputOf(props);
    const normalized = normalizeGraphAuthoringChildren(input.children ?? [], context, 'BlockSection.children');
    const dependencies = createGraphProviderDependencies(BlockSectionProviderKey);
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
export const blockSection = (input: BlockSectionInputEmbedProps) =>
  createGraphInputEmbed(BlockSectionEmbedKind, input, input.id);
