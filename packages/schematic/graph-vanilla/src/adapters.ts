import type { InputEmbedAdapter } from '@retikz/vanilla';

import { EntityInputEmbedAdapter } from './entity';
import { GraphInputEmbedAdapter } from './graph';
import { RelationInputEmbedAdapter } from './relation';

/** 擦除 Graph Vanilla adapter 的具体 props 类型 */
const eraseAdapter = <TProps>(adapter: InputEmbedAdapter<TProps>): InputEmbedAdapter<unknown> => ({
  kind: adapter.kind,
  lower: (props, context) => adapter.lower(props as TProps, context),
});

/** 创建可一次性传给 Vanilla normalize 的 Graph adapter 集合 */
export const createGraphVanillaAdapters = (): Array<InputEmbedAdapter<unknown>> => [
  eraseAdapter(GraphInputEmbedAdapter),
  eraseAdapter(EntityInputEmbedAdapter),
  eraseAdapter(RelationInputEmbedAdapter),
];
