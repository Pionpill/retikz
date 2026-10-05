import { createOpenStringSchema, NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, null as zodNull, number, strictObject, string, union } from 'zod';

import { DataFieldFormat, DataFieldType, FieldOrderMode } from './constants';

/** 校验内置或自定义的字段值解析格式名称 */
export const FieldFormatSchema = createOpenStringSchema(DataFieldFormat).describe(
  'Field value-parsing format name; built-in or custom.',
);

/** 校验数据字段名称、度量类型、解析格式与类别顺序声明 */
export const FieldDefinitionSchema = strictObject({
  name: NonBlankStringSchema.describe('Field name or dotted path'),
  type: zodEnum(DataFieldType).optional().describe('Field measurement type; omitted means infer from data'),
  format: FieldFormatSchema.optional().describe('Value-parsing format; omitted means default coercion'),
  order: union([zodEnum(FieldOrderMode), array(union([string(), number()])).min(1)])
    .optional()
    .describe('Category order; omitted means appearance order'),
}).describe('Field declaration for type, format, and category order');

/** 校验字段名互不重复的外部数据模型声明 */
export const DataModelSchema = array(FieldDefinitionSchema)
  .superRefine((fields, context) => {
    const names = new Set<string>();
    fields.forEach((field, index) => {
      if (names.has(field.name)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'name'],
          message: `duplicate data model field "${field.name}"`,
        });
      }

      names.add(field.name);
    });
  })
  .describe('External data field declarations with unique names');

/** 校验按名称绑定的外部数据集引用，实际数据保持在 IR 之外 */
export const DataReferenceSchema = strictObject({
  reference: NonBlankStringSchema.describe('External dataset name; data values stay outside the IR'),
  model: DataModelSchema.optional().describe('Optional field declarations'),
}).describe('IR data binding by external dataset name');

/** 校验可 JSON 序列化的字符串、数值、布尔或 null 标量 */
export const ScalarValueSchema = union([string(), number(), boolean(), zodNull()]).describe('JSON scalar value');
