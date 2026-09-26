import { EntityProviderKey } from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { EntityEmbedKind } from './constants';
import { createGraphInputEmbed } from './input-embed';
import type { InputEntity, WithoutInputType } from './normalize';
import { normalizeEntity } from './normalize';
import { createGraphProviderDependencies } from './providers';

/** Entity embed 的 Source authoring 输入 */
export type EntityInputEmbedProps = WithoutInputType<InputEntity>;

const inputOf = (props: EntityInputEmbedProps): InputEntity => {
  return { type: 'entity', ...props };
};

/** Entity Source 的 InputEmbed adapter */
export const EntityInputEmbedAdapter: InputEmbedAdapter<EntityInputEmbedProps> = {
  kind: EntityEmbedKind,
  lower: props => ({
    node: normalizeEntity(inputOf(props)),
    providerDependencies: createGraphProviderDependencies(EntityProviderKey),
  }),
};

/** 创建 Entity Source 的 authoring embed 节点 */
export const entity = (input: EntityInputEmbedProps) => createGraphInputEmbed(EntityEmbedKind, input, input.id);
