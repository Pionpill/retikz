import { createOpenStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { BuiltinTableCellPresentation } from './constants';

/** Table 内置 presentation 与自定义注册名共享的开放名称 schema */
export const TableCellPresentationNameSchema = createOpenStringSchema(BuiltinTableCellPresentation).describe(
  'Exact registered Cell presentation provider name. Whitespace is preserved.',
);

/** 校验单元格呈现能力的注册名称与 JSON 选项 */
export const TablePresentationRefSchema = strictObject({
  name: TableCellPresentationNameSchema,
  options: JsonObjectSchema.optional().describe('JSON options validated by the selected presentation provider.'),
}).describe('Reference to a registered Cell presentation provider and its JSON options.');
