import type { AnyInputEmbedAdapter } from '@retikz/vanilla';

/** 同步 authoring 用例必须保留全部 adapter，并拒绝意外混入的异步入口 */
export const synchronousAdapters = (adapters: ReadonlyArray<AnyInputEmbedAdapter>) =>
  adapters.map(adapter => {
    if (adapter.lower === undefined) throw new Error(`Expected synchronous adapter: ${adapter.kind}`);
    return { ...adapter, lower: adapter.lower };
  });
