import type { InputEmbedAdapter } from '@retikz/vanilla';

import { BlockInputEmbedAdapter } from './block';
import { BlockHeaderInputEmbedAdapter } from './block-header';
import { BlockRowInputEmbedAdapter } from './block-row';
import { BlockSectionInputEmbedAdapter } from './block-section';
import { EntityInputEmbedAdapter } from './entity';
import { GraphInputEmbedAdapter } from './graph';
import { GroupInputEmbedAdapter } from './group';
import { RelationInputEmbedAdapter } from './relation';

/** 擦除 Graph Vanilla adapter 的具体 props 类型 */
const eraseAdapter = <TProps>(adapter: InputEmbedAdapter<TProps>): InputEmbedAdapter<unknown> => ({
  kind: adapter.kind,
  lower: (props, context) => adapter.lower(props as TProps, context),
});

/** 创建可一次性传给 Vanilla normalize 的 Graph adapter 集合 */
export const createGraphVanillaAdapters = (): Array<InputEmbedAdapter<unknown>> => [
  eraseAdapter(GraphInputEmbedAdapter),
  eraseAdapter(GroupInputEmbedAdapter),
  eraseAdapter(BlockInputEmbedAdapter),
  eraseAdapter(BlockHeaderInputEmbedAdapter),
  eraseAdapter(BlockSectionInputEmbedAdapter),
  eraseAdapter(BlockRowInputEmbedAdapter),
  eraseAdapter(EntityInputEmbedAdapter),
  eraseAdapter(RelationInputEmbedAdapter),
];
