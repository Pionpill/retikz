import { z } from 'zod';

import { DataFieldType, FieldOrderMode } from './constants';

/** 字段解析格式名 schema；具体 parser 在运行时通过 FieldFormatDefinition registry 解析。 */
export const FieldFormatSchema = z.string().min(1).describe('Field value-parsing format name; built-in or custom');

/** 单个字段声明 schema；用于描述逻辑字段名、测量类型、格式和分类顺序。 */
export const FieldDefSchema = z
  .strictObject({
    name: z.string().min(1).describe('Field name or dotted path'),
    type: z.enum(DataFieldType).optional().describe('Field measurement type; omitted means infer from data'),
    format: FieldFormatSchema.optional().describe('Value-parsing format; omitted means default coercion'),
    order: z
      .union([z.enum(FieldOrderMode), z.array(z.union([z.string(), z.number()])).min(1)])
      .optional()
      .describe('Category order; omitted means appearance order'),
  })
  .describe('Field declaration for type, format, and category order');

/** 数据模型 schema；IR 中可选携带，用于 strict 字段引用校验和 type-driven scale 派生。 */
export const DataModelSchema = z.array(FieldDefSchema).describe('External data field declarations');

/** 数据引用 schema；IR 只记录外部数据集名称，不存储实际行数据。 */
export const DataRefSchema = z
  .strictObject({
    reference: z.string().min(1).describe('External dataset name; data values stay outside the IR'),
    model: DataModelSchema.optional().describe('Optional field declarations'),
  })
  .describe('IR data binding by external dataset name');

/** 标量值 schema；字段路径叶子和常量 channel 共用的 JSON 值域。 */
export const ScalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]).describe('JSON scalar value');
