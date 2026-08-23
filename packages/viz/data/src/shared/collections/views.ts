/**
 * 创建不暴露写方法的 Set 只读视图。
 * @description 底层 Set 仅存在于闭包内；迭代与查询保持原生语义，forEach 的 owner 参数返回只读视图自身
 */
export const createReadonlySet = <TValue>(values: Iterable<TValue>): ReadonlySet<TValue> => {
  const source = new Set<TValue>(values);
  const view: ReadonlySet<TValue> = {
    get size(): number {
      return source.size;
    },
    difference: other => source.difference(other),
    entries: () => source.entries(),
    forEach: (callback: (value: TValue, key: TValue, set: ReadonlySet<TValue>) => void, thisArg?: unknown): void => {
      source.forEach(value => callback.call(thisArg, value, value, view));
    },
    has: value => source.has(value),
    intersection: other => source.intersection(other),
    isDisjointFrom: other => source.isDisjointFrom(other),
    isSubsetOf: other => source.isSubsetOf(other),
    isSupersetOf: other => source.isSupersetOf(other),
    keys: () => source.keys(),
    symmetricDifference: other => source.symmetricDifference(other),
    union: other => source.union(other),
    values: () => source.values(),
    [Symbol.iterator]: () => source[Symbol.iterator](),
  };
  return Object.freeze(view);
};
