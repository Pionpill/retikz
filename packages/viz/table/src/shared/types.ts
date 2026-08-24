/** 把 JSON 风格对象递归映射为只读类型 */
export type DeepReadonly<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends ReadonlyArray<infer TValue>
    ? ReadonlyArray<DeepReadonly<TValue>>
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T;
