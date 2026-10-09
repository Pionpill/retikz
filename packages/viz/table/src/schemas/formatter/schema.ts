import { createOpenStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { BuiltinTableCellFormatter } from './constants';

/** Table 内置 formatter 与自定义注册名共享的开放名称 schema */
export const TableCellFormatterNameSchema = createOpenStringSchema(BuiltinTableCellFormatter).describe(
  'Exact registered Cell formatter provider name. Whitespace is preserved.',
);

/** 校验单元格格式化能力的注册名称与 JSON 选项 */
export const TableFormatterRefSchema = strictObject({
  name: TableCellFormatterNameSchema,
  options: JsonObjectSchema.optional().describe('JSON options validated by the selected formatter provider.'),
}).describe('Reference to a registered Cell formatter provider and its JSON options.');
