import { z } from 'zod';
import type { JsonValue } from './types';

/**
 * 递归 JSON 值 schema
 * @description 守 IR 100% JSON 可序列化：path generator step 的 params 只能由 JSON 值构成；
 *   函数 / undefined / class 实例 / Symbol / Map / Set 等非 JSON 值在 parse 阶段被拒。
 *   `z.lazy` 让 array / object 分支可递归引用本 schema，深度不限。
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(JsonValueSchema),
      JsonObjectSchema,
    ])
    .describe(
      'Recursive JSON value allowed in IR payloads: string, number, boolean, null, array, or object.',
    ),
);

/**
 * JSON 对象 schema
 * @description path generator step 的 `params` 类型；键为字符串、值为递归 JSON 值。
 *   作为 compile 运行时的第二道护栏：即便外部 `paramsSchema` 是宽松类型，对其 parse 结果再跑本 schema
 *   可拦下非 JSON 输出（function / undefined 等）。core 公开供外部 refine。
 */
export const JsonObjectSchema = z
  .record(z.string(), JsonValueSchema)
  .describe(
    'JSON object with string keys and recursive JSON values. Used for params and opaque metadata payloads.',
  );
