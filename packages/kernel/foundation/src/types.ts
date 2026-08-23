/** 取得对象所有 value 的联合类型 */
export type ValueOf<T extends object> = T[keyof T];

/** 双向检查两个类型是否等价 */
export type AssertEqual<TActual, TExpected> = [TActual] extends [TExpected]
  ? [TExpected] extends [TActual]
    ? true
    : false
  : false;

/** 保留已知字符串提示，同时接受任意字符串 */
export type OpenString<T extends string> = T | (string & {});

/** 至少包含一个元素的只读数组 */
export type NonEmptyReadonlyArray<T> = readonly [T, ...Array<T>];
