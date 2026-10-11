import { createOpenStringSchema, JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { enum as zodEnum, literal, strictObject, string, union } from 'zod';

import { TableCellSelectorSchema } from '../rule';
import { BuiltinTableCellVisualScale, TableVisualChannel } from './constants';

/** Table 内置 visual scale 与自定义注册名共享的开放名称 schema */
export const TableCellVisualScaleNameSchema = createOpenStringSchema(BuiltinTableCellVisualScale).describe(
  'Registered Table Cell visual scale definition name.',
);

/** 校验表格视觉比例尺的注册名称与选项引用 */
export const TableVisualScaleRefSchema = strictObject({
  name: TableCellVisualScaleNameSchema,
  options: JsonObjectSchema.optional().describe('JSON-safe options parsed by the selected visual scale definition.'),
}).describe('Reference to a registered Table Cell visual scale definition.');

/** 校验按顺序作用于原始单元格标量值的视觉编码声明 */
export const TableCellVisualEncodingSchema = strictObject({
  id: NonBlankStringSchema.describe('Stable visual encoding id unique within one Table.'),
  selector: TableCellSelectorSchema.describe('Value Cell candidates selected from the canonical Table model.'),
  channel: zodEnum(TableVisualChannel).describe('Single Cell appearance color channel owned by this encoding.'),
  scale: TableVisualScaleRefSchema.describe('Visual scale used to map selected raw scalar values to colors.'),
  legend: union([
    literal(false),
    strictObject({
      title: string().optional().describe('Optional Table-owned title forwarded with the Legend descriptor.'),
    }),
  ])
    .optional()
    .describe('Explicit Legend descriptor opt-in; false or omission produces no descriptor.'),
}).describe('Ordered Table Cell visual encoding over canonical raw scalar values.');
