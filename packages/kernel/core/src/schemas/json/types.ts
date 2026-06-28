import type { z } from 'zod';
import type { JsonObjectSchema } from './schema';

/** 单个 JSON 值（字符串 / 数字 / 布尔 / null / 数组 / 对象，递归） */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue };

/** JSON 对象类型（path generator step 的 params 形态） */
export type IRJsonObject = z.infer<typeof JsonObjectSchema>;
