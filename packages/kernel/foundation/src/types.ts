import type { infer as ZodInfer } from 'zod';

import type { JsonObjectSchema } from './schema';

/** 取得对象所有 value 的联合类型 */
export type ValueOf<T extends object> = T[keyof T];

/** 单个递归 JSON 值；readonly 数组允许 const Source 在 parse 边界直接收窄 */
export type JsonValue = string | number | boolean | null | ReadonlyArray<JsonValue> | { [key: string]: JsonValue };

/** 字符串键 JSON 对象 */
export type JsonObject = ZodInfer<typeof JsonObjectSchema>;

/** 双向检查两个类型是否等价 */
export type AssertEqual<TActual, TExpected> = [TActual] extends [TExpected]
  ? [TExpected] extends [TActual]
    ? true
    : false
  : false;

/** 保留已知字符串提示，同时接受任意字符串 */
export type OpenString<T extends string> = T | (string & {});

/** 将指定属性收窄为必填，同时保留其余属性 */
export type WithRequiredProperties<T, TKey extends keyof T> = T & Required<Pick<T, TKey>>;

/** 至少包含一个元素的只读数组 */
export type NonEmptyReadonlyArray<T> = readonly [T, ...Array<T>];
