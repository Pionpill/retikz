import { JsonObjectSchema } from '@retikz/core';
import { createOpenStringSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { TableCellFormatter } from './constants';

/** Table 内置 formatter 与自定义注册名共享的开放名称 schema */
export const TableCellFormatterNameSchema = createOpenStringSchema(TableCellFormatter).describe(
  'Exact registered Cell formatter provider name. Whitespace is preserved.',
);

export const TableFormatterRefSchema = strictObject({
  name: TableCellFormatterNameSchema,
  options: JsonObjectSchema.optional().describe('JSON options validated by the selected formatter provider.'),
}).describe('Reference to a registered Cell formatter provider and its JSON options.');
