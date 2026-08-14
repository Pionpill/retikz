import type { InputLayerMeta, InputRuntimeMeta } from './types';

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

/** 复制并冻结输入 runtime metadata */
export const createInputRuntimeMetaSnapshot = (input: InputRuntimeMeta): InputRuntimeMeta => {
  const layers = Object.freeze(
    input.layers.map(
      (layer): InputLayerMeta =>
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

/** 创建独立的空输入 runtime metadata */
export const createEmptyInputRuntimeMetaSnapshot = (): InputRuntimeMeta =>
  createInputRuntimeMetaSnapshot({ layers: [], identityIndex: new Map(), parentIndex: new Map() });
