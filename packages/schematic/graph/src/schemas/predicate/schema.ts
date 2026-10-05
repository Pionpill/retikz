import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

/** 校验图成员谓词的注册名称与 JSON 参数引用 */
export const GraphPredicateRefSchema = strictObject({
  name: NonBlankStringSchema.describe('Registered member predicate definition name.'),
  params: JsonObjectSchema.optional().describe('JSON parameters validated by the selected predicate definition.'),
}).describe('Reference to one registered Graph member predicate and its JSON parameters.');
