/** 获取对象所有值的联合类型，等价于 `(typeof T)[keyof typeof T]`。 */
export type ValueOf<T extends object> = T[keyof T];

/**
 * 类型层等价检查工具。
 *
 * @description 当 `TActual` 与 `TExpected` 完全等价时类型为 `true`，否则为 `false`。常用于
 * `as const satisfies` 字段表互锁，让漏字段 / 多字段在 TS 编译期报错。
 */
export type AssertEqual<TActual, TExpected> = [TActual] extends [TExpected]
  ? [TExpected] extends [TActual]
    ? true
    : false
  : false;
