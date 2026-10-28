import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { flowDiagramInputEmbedAdapter } from './flow-diagram';

/** 创建可一次性传给 Vanilla normalize 的 Flow Diagram adapter 集合 */
export const createFlowDiagramVanillaAdapters = (): Array<SynchronousInputEmbedAdapter<unknown>> => {
  /** 擦除 Flow Diagram adapter 的具体 props 类型 */
  const eraseAdapter = <TProps>(
    adapter: SynchronousInputEmbedAdapter<TProps>,
  ): SynchronousInputEmbedAdapter<unknown> => ({
    kind: adapter.kind,
    lower: (props, context) => adapter.lower(props as TProps, context),
  });

  return [eraseAdapter(flowDiagramInputEmbedAdapter)];
};
