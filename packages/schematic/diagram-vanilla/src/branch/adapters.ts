import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { BranchDiagramInputEmbedAdapter } from './branch-diagram';

/** 擦除 Branch Diagram adapter 的具体 props 类型 */
const eraseAdapter = <TProps>(
  adapter: SynchronousInputEmbedAdapter<TProps>,
): SynchronousInputEmbedAdapter<unknown> => ({
  kind: adapter.kind,
  lower: (props, context) => adapter.lower(props as TProps, context),
});

/** 创建可一次性传给 Vanilla normalize 的 Branch Diagram adapter 集合 */
export const createBranchDiagramVanillaAdapters = (): Array<SynchronousInputEmbedAdapter<unknown>> => [
  eraseAdapter(BranchDiagramInputEmbedAdapter),
];
