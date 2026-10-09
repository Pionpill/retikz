import { createOpenStringSchema, NonBlankStringSchema } from '@retikz/foundation';
import {
  array,
  boolean,
  enum as zodEnum,
  literal,
  never,
  null as zodNull,
  number,
  strictObject,
  string,
  union,
} from 'zod';

import { BuiltinDataFieldFormat, DataFieldType, BuiltinFieldOrderMode } from './constants';

/** 校验内置或自定义的字段值解析格式名称 */
export const FieldFormatSchema = createOpenStringSchema(BuiltinDataFieldFormat).describe(
  'Field value-parsing format name; built-in or custom.',
);

/** 各测量类型共享的字段名称与解析格式 */
const FieldDefinitionBaseSchema = strictObject({
  name: NonBlankStringSchema.describe('Field name or dotted path'),
  format: FieldFormatSchema.optional().describe('Value-parsing format; omitted means default coercion'),
});

/** 分类字段的顺序声明；省略时按数据出现顺序 */
const FieldOrderSchema = union([
  createOpenStringSchema(BuiltinFieldOrderMode),
  array(union([string(), number()])).min(1),
])
  .optional()
  .describe('Category order; omitted means appearance order');

/** 校验字段声明；仅分类字段或待推断为分类的字段可声明类别顺序 */
export const FieldDefinitionSchema = union([
  FieldDefinitionBaseSchema.extend({
    type: literal(DataFieldType.Categorical).describe('Categorical field measurement type'),
    order: FieldOrderSchema,
  }),
  FieldDefinitionBaseSchema.extend({
    type: zodEnum([DataFieldType.Continuous, DataFieldType.Temporal]).describe(
      'Continuous or temporal field measurement type',
    ),
    order: never().optional().describe('Category order is not supported for continuous or temporal fields'),
  }),
  FieldDefinitionBaseSchema.extend({
    type: never().optional().describe('Omitted measurement type; infer from format or data'),
    order: FieldOrderSchema,
  }),
]).describe('Field declaration for type, format, and category order');

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
