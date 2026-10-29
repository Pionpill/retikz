import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { array, number, strictObject, string, union } from 'zod';
import type { input } from 'zod';

import { ScalarValueSchema } from '../model';

/** 数值或字符串输出范围；同一映射不混合输出类型 */
export const ScaleRangeSchema = union([array(number()).min(1), array(string()).min(1)]);

/** 宿主无关的映射声明，专有参数由对应定义解析 */
export const ScaleOperationSchema = strictObject({
  type: NonBlankStringSchema.describe('Registered mapping type'),
  domain: array(ScalarValueSchema)
    .optional()
    .describe('Explicit input domain; omitted domains use the supplied samples'),
  range: ScaleRangeSchema.optional().describe('Explicit homogeneous scalar output range'),
  params: JsonObjectSchema.optional().describe('JSON parameters interpreted by the registered mapping definition'),
});

export type IRDataScaleOperation = input<typeof ScaleOperationSchema>;
