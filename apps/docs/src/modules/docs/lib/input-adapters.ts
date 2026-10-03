import type { AnyInputEmbedAdapter, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

/** 静态源码推导只接受同步作者入口，不启动异步准备或计算 */
export const synchronousInputAdaptersOf = (
  adapters: ReadonlyArray<AnyInputEmbedAdapter>,
): ReadonlyArray<SynchronousInputEmbedAdapter<never>> =>
  adapters.map(adapter => {
    if (adapter.lower === undefined)
      throw new Error(`Static preview adapter "${adapter.kind}" requires synchronous lower`);
    return { ...adapter, lower: adapter.lower };
  });
