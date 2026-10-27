import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { blockInputEmbedAdapter } from './block';
import { blockHeaderInputEmbedAdapter } from './block-header';
import { blockRowInputEmbedAdapter } from './block-row';
import { blockSectionInputEmbedAdapter } from './block-section';
import { entityInputEmbedAdapter } from './entity';
import { graphInputEmbedAdapter } from './graph';
import { groupInputEmbedAdapter } from './group';
import { relationInputEmbedAdapter } from './relation';

/**
 * 创建可一次性传给 Vanilla normalize 的 Graph adapter 集合
 * @returns 包含 Graph、Group、Block 家族、Entity 和 Relation 的新 adapter 数组
 */
export const createGraphVanillaAdapters = (): Array<SynchronousInputEmbedAdapter<unknown>> => {
  /** 擦除 Graph Vanilla adapter 的具体 props 类型 */
  const eraseAdapter = <TProps>(
    adapter: SynchronousInputEmbedAdapter<TProps>,
  ): SynchronousInputEmbedAdapter<unknown> => ({
    kind: adapter.kind,
    lower: (props, context) => adapter.lower(props as TProps, context),
  });

  return [
    eraseAdapter(graphInputEmbedAdapter),
    eraseAdapter(groupInputEmbedAdapter),
    eraseAdapter(blockInputEmbedAdapter),
    eraseAdapter(blockHeaderInputEmbedAdapter),
    eraseAdapter(blockSectionInputEmbedAdapter),
    eraseAdapter(blockRowInputEmbedAdapter),
    eraseAdapter(entityInputEmbedAdapter),
    eraseAdapter(relationInputEmbedAdapter),
  ];
};
