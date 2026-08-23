import { JsonObjectSchema } from '@retikz/core';
import { createOpenStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { TableCellPresentation } from './constants';

/** Table 内置 presentation 与自定义注册名共享的开放名称 schema */
export const TableCellPresentationNameSchema = createOpenStringSchema(TableCellPresentation).describe(
  'Exact registered Cell presentation provider name. Whitespace is preserved.',
);

export const TablePresentationRefSchema = z
  .strictObject({
    name: TableCellPresentationNameSchema,
    options: JsonObjectSchema.optional().describe('JSON options validated by the selected presentation provider.'),
  })
  .describe('Reference to a registered Cell presentation provider and its JSON options.');
