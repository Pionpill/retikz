/** 获取对象所有值的联合类型，等价于 (typeof T)[keyof typeof T] */
export type ValueOf<T extends object> = T[keyof T];

/**
 * 类型层等价检查工具（internal idiom，公开 API 不导出）
 * @description 当 A、B 完全等价时类型为 `true`，否则为 `false`——配合 `as const satisfies` 实现"字段表必须完备覆盖类型 key 集合"的互锁；漏字段或多字段 TS 编译期报错
 * @example
 *   const NODE_FIELDS = ['id', 'shape'] as const satisfies ReadonlyArray<keyof IRNode>;
 *   type _Check = AssertEqual<typeof NODE_FIELDS[number], keyof IRNode>;
 */
export type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
