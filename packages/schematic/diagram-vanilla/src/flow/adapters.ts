import type { InputEmbedAdapter } from '@retikz/vanilla';

import { FlowDiagramInputEmbedAdapter } from './flow-diagram';

/** 擦除 Flow Diagram adapter 的具体 props 类型 */
const eraseAdapter = <TProps>(adapter: InputEmbedAdapter<TProps>): InputEmbedAdapter<unknown> => ({
  kind: adapter.kind,
  lower: (props, context) => adapter.lower(props as TProps, context),
});

/** 创建可一次性传给 Vanilla normalize 的 Flow Diagram adapter 集合 */
export const createFlowDiagramVanillaAdapters = (): Array<InputEmbedAdapter<unknown>> => [
  eraseAdapter(FlowDiagramInputEmbedAdapter),
];
