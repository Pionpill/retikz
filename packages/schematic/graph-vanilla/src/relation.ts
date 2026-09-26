import { RelationProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { RelationEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputRelation, WithoutInputType } from './normalize';
import { normalizeRelation } from './normalize';
import { createGraphProviderDependencies } from './providers';

/** Relation embed 的 Source authoring 输入 */
export type RelationInputEmbedProps = WithoutInputType<InputRelation>;

const inputOf = (props: RelationInputEmbedProps): InputRelation => {
  return { type: 'relation', ...props };
};

/** Relation Source 的 InputEmbed adapter */
export const RelationInputEmbedAdapter: InputEmbedAdapter<RelationInputEmbedProps> = {
  kind: RelationEmbedKind,
  lower: props => ({
    node: normalizeRelation(inputOf(props)),
    providerDependencies: createGraphProviderDependencies(RelationProviderKey),
  }),
};

/** 创建 Relation Source 的 authoring embed 节点 */
export const relation = (input: RelationInputEmbedProps) => createGraphInputEmbed(RelationEmbedKind, input, input.id);
