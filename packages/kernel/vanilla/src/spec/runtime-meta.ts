import type { VanillaLayerMeta, VanillaRuntimeMeta } from './types';

/** 创建不暴露可变 Map 方法的只读快照 */
const createReadonlyMapSnapshot = <TKey, TValue>(
  entries: Iterable<readonly [TKey, TValue]>,
): ReadonlyMap<TKey, TValue> => {
  const storage = new Map(entries);
  const snapshot: ReadonlyMap<TKey, TValue> = Object.freeze({
    get size() {
      return storage.size;
    },
    entries: () => storage.entries(),
    forEach: (callback: (value: TValue, key: TKey, map: ReadonlyMap<TKey, TValue>) => void, thisArg?: unknown) => {
      for (const [key, value] of storage) callback.call(thisArg, value, key, snapshot);
    },
    get: (key: TKey) => storage.get(key),
    has: (key: TKey) => storage.has(key),
    keys: () => storage.keys(),
    values: () => storage.values(),
    [Symbol.iterator]: () => storage[Symbol.iterator](),
  });
  return snapshot;
};

/** 复制并冻结 Vanilla runtime metadata，隔离 normalization 内部状态与公开 read */
export const createRuntimeMetaSnapshot = (input: VanillaRuntimeMeta): VanillaRuntimeMeta => {
  const layers = Object.freeze(
    input.layers.map(
      (layer): VanillaLayerMeta =>
        Object.freeze({
          ...layer,
          childIds: Object.freeze([...layer.childIds]),
        }),
    ),
  );
  const identityIndex = createReadonlyMapSnapshot(
    Array.from(input.identityIndex, ([identity, path]) => [identity, Object.freeze([...path])] as const),
  );
  const parentIndex = createReadonlyMapSnapshot(input.parentIndex);
  return Object.freeze({ layers, identityIndex, parentIndex });
};

/** 创建独立的空 Vanilla runtime metadata 快照 */
export const createEmptyRuntimeMetaSnapshot = (): VanillaRuntimeMeta =>
  createRuntimeMetaSnapshot({ layers: [], identityIndex: new Map(), parentIndex: new Map() });
