/**
 * 创建不暴露写方法的 Map 浅快照
 * @description 输入 entries 会复制到独立存储；迭代与查询保持原生 Map 语义，`forEach` 的 owner 参数返回只读快照自身
 * @template TKey Map 键类型
 * @template TValue Map 值类型
 * @param entries 用于创建快照的键值对
 * @returns 独立的只读 Map 包装；键和值仍共享原引用，不进行深冻结
 */
export const createReadonlyMap = <TKey, TValue>(
  entries: Iterable<readonly [TKey, TValue]>,
): ReadonlyMap<TKey, TValue> => {
  const storage = new Map<TKey, TValue>(entries);
  const snapshot: ReadonlyMap<TKey, TValue> = {
    get size(): number {
      return storage.size;
    },
    entries: () => storage.entries(),
    forEach: (
      callback: (value: TValue, key: TKey, map: ReadonlyMap<TKey, TValue>) => void,
      thisArg?: unknown,
    ): void => {
      storage.forEach((value, key) => callback.call(thisArg, value, key, snapshot));
    },
    get: key => storage.get(key),
    has: key => storage.has(key),
    keys: () => storage.keys(),
    values: () => storage.values(),
    [Symbol.iterator]: () => storage[Symbol.iterator](),
  };
  return Object.freeze(snapshot);
};
