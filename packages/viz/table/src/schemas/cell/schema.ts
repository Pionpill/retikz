import { BoxSpacingSchema, ChildSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { NonBlankStringSchema, NonNegativeNumberSchema, PositiveIntegerSchema } from '@retikz/foundation';
import { array, boolean, discriminatedUnion, enum as zodEnum, literal, number, strictObject, string, union } from 'zod';

import { TableCellBordersSchema } from '../border';
import { TableFormatterRefSchema } from '../formatter';
import { TablePresentationRefSchema } from '../presentation';
import {
  TableCellFit,
  TableCellLocation,
  TableCellOverflow,
  TableCellPayloadKind,
  TableCellRole,
  TableHorizontalAlignment,
  TableVerticalAlignment,
} from './constants';

/** 校验单元格所属的表格语义区域 */
export const TableCellLocationSchema = zodEnum(TableCellLocation).describe(
  'Semantic Table region occupied by the Cell.',
);

/** 校验赋予单元格的语义角色 */
export const TableCellRoleSchema = zodEnum(TableCellRole).describe('Semantic role assigned to a Table Cell.');

/** 校验内容在单元格内容盒中的横向对齐方式 */
export const TableHorizontalAlignmentSchema = zodEnum(TableHorizontalAlignment).describe(
  'Horizontal alignment of content inside a Table Cell content box.',
);

/** 校验内容在单元格内容盒中的纵向对齐方式 */
export const TableVerticalAlignmentSchema = zodEnum(TableVerticalAlignment).describe(
  'Vertical alignment of content inside a Table Cell content box.',
);

/** 校验单元格内容的最终缩放适配策略 */
export const TableCellFitSchema = zodEnum(TableCellFit).describe('Final content scaling policy inside a Table Cell.');

/** 校验单元格内容溢出时采用可见或裁剪策略 */
export const TableCellOverflowSchema = zodEnum(TableCellOverflow).describe(
  'Visible or clipped overflow policy for Table Cell content.',
);

/** 校验单元格的矩形行列跨度，缺省轴在运行时取 1 */
export const TableCellSpanSchema = strictObject({
  rows: PositiveIntegerSchema.optional().describe('Positive number of consecutive rows covered by the Cell.'),
  columns: PositiveIntegerSchema.optional().describe('Positive number of consecutive columns covered by the Cell.'),
}).describe('Optional rectangular Table Cell span; omitted axes use 1 at runtime.');

/** 校验单元格内边距、对齐、折行、缩放、溢出与边框选项 */
export const TableCellLayoutSchema = strictObject({
  padding: union([NonNegativeNumberSchema, BoxSpacingSchema])
    .optional()
    .describe('Nonnegative uniform or per-side padding inside the Table Cell box.'),
  horizontalAlign: TableHorizontalAlignmentSchema.optional().describe(
    'Horizontal content alignment. Omitted fields use center at runtime.',
  ),
  verticalAlign: TableVerticalAlignmentSchema.optional().describe(
    'Vertical content alignment. Omitted fields use center at runtime.',
  ),
  wrap: boolean().optional().describe('Whether to request width-constrained child layout. Omitted fields use false.'),
  fit: TableCellFitSchema.optional().describe('Final content scaling policy. Omitted fields use none at runtime.'),
  overflow: TableCellOverflowSchema.optional().describe(
    'Content overflow policy. Omitted fields use visible at runtime.',
  ),
  borders: TableCellBordersSchema.optional().describe('Optional per-side Table Cell border candidates.'),
}).describe('Table Cell padding, alignment, reflow, fit, overflow, and border options.');

/** 校验需要经格式化与呈现能力处理的标量单元格载荷 */
export const TableCellValuePayloadSchema = strictObject({
  kind: literal(TableCellPayloadKind.Value).describe('Discriminator for a scalar value Cell payload.'),
  value: ScalarValueSchema.describe('JSON scalar value presented as Core content at runtime.'),
  formatter: TableFormatterRefSchema.optional().describe(
    'Optional formatter provider reference. Omitted fields use the built-in identity formatter.',
  ),
  presentation: TablePresentationRefSchema.optional().describe(
    'Optional presentation provider reference. Omitted fields use the built-in text presentation.',
  ),
}).describe('Scalar value Cell payload resolved through the presentation registry.');

/** 校验直接使用 Core 子项、跳过标量呈现的单元格载荷 */
export const TableCellContentPayloadSchema = strictObject({
  kind: literal(TableCellPayloadKind.Content).describe('Discriminator for a direct Core child Cell payload.'),
  content: ChildSchema.describe('Direct JSON-safe Core or Tier 2 child authored in Cell-local coordinates.'),
}).describe('Direct Core child Cell payload that bypasses value presentation.');

/** 校验标量呈现或直接 Core 内容两种单元格载荷 */
export const TableCellPayloadSchema = discriminatedUnion('kind', [
  TableCellValuePayloadSchema,
  TableCellContentPayloadSchema,
]).describe('Table Cell payload: a scalar value presentation or direct Core child content.');

const ManualTableCellSharedShape = {
  id: NonBlankStringSchema.optional().describe('Optional stable Cell id.'),
  location: TableCellLocationSchema.optional().describe(
    'Optional semantic location. Omitted fields derive from the containing row kind.',
  ),
  roles: array(TableCellRoleSchema)
    .min(1)
    .optional()
    .describe('Optional semantic roles. Omitted fields derive from the containing row kind.'),
  span: TableCellSpanSchema.optional().describe('Optional rectangular Cell span. Omitted fields use 1 × 1.'),
  layout: TableCellLayoutSchema.optional().describe('Optional Cell layout policy with runtime defaults.'),
};

/** 校验显式表格中以标量值编写的单元格 */
export const ManualTableValueCellSchema = strictObject({
  ...ManualTableCellSharedShape,
  value: ScalarValueSchema.describe('JSON scalar value presented as Core content at runtime.'),
  formatter: TableFormatterRefSchema.optional().describe(
    'Optional formatter provider reference. Omitted fields use the built-in identity formatter.',
  ),
  presentation: TablePresentationRefSchema.optional().describe(
    'Optional presentation provider reference. Omitted fields use the built-in text presentation.',
  ),
}).describe('Manual Table Cell authored from a scalar value.');

/** 校验显式表格中直接编写 Core 内容的单元格 */
export const ManualTableContentCellSchema = strictObject({
  ...ManualTableCellSharedShape,
  content: ChildSchema.describe('Direct JSON-safe Core or Tier 2 child authored in Cell-local coordinates.'),
}).describe('Manual Table Cell authored from direct Core child content.');

/** 校验显式单元格的标量简写或带字段的值与内容对象 */
export const ManualTableCellSchema = union([
  string().describe('String shorthand for a value Cell.'),
  number().describe('Number shorthand for a value Cell.'),
  boolean().describe('Boolean shorthand for a value Cell.'),
  ManualTableValueCellSchema,
  ManualTableContentCellSchema,
]).describe('Manual Table Cell entry authored as scalar shorthand or a rich value/content object.');
