import { OpacitySchema, PaintValueSchema } from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, discriminatedUnion, enum as zodEnum, literal, number, strictObject } from 'zod';

import { TableBorderKind, TableBorderMode } from './constants';

const requireAtLeastOneField = (label: string) => ({
  message: `${label} must contain at least one field.`,
});

export const TableBorderKindSchema = zodEnum(TableBorderKind).describe('Discriminator for a Table border candidate.');

export const TableBorderModeSchema = zodEnum(TableBorderMode).describe(
  'Shared-edge collapse or per-Cell separate mode.',
);

const TableBorderPrioritySchema = number().refine(Number.isInteger, {
  message: 'Border priority must be a finite integer.',
});

export const TableNoBorderSchema = strictObject({
  kind: literal(TableBorderKind.None).describe('Discriminator for an explicit hidden border candidate.'),
  priority: TableBorderPrioritySchema.optional().describe('Finite integer conflict priority. Omitted fields use 0.'),
}).describe('Explicit Table border suppression candidate.');

export const TableLineBorderSchema = strictObject({
  kind: literal(TableBorderKind.Line).describe('Discriminator for a Table line border candidate.'),
  stroke: PaintValueSchema.refine(value => value !== 'none', {
    message: 'Table border stroke must not be none.',
  })
    .optional()
    .describe('Core paint for the border line. Omitted fields use currentColor.'),
  width: NonNegativeNumberSchema.optional().describe('Nonnegative border width. Omitted fields use 1.'),
  strokeOpacity: OpacitySchema.optional().describe('Border stroke opacity. Omitted fields use 1.'),
  dashPattern: array(PositiveNumberSchema)
    .min(1)
    .optional()
    .describe('Optional non-empty positive dash pattern; omission means solid.'),
  dashOffset: number().optional().describe('Finite dash offset. Omitted fields use 0.'),
  priority: TableBorderPrioritySchema.optional().describe('Finite integer conflict priority. Omitted fields use 0.'),
}).describe('Core-compatible Table line border candidate.');

export const TableBorderSchema = discriminatedUnion('kind', [TableNoBorderSchema, TableLineBorderSchema]).describe(
  'Table border candidate: explicit none or a complete line source.',
);

export const TableCellBordersSchema = strictObject({
  top: TableBorderSchema.optional().describe('Optional top-side border candidate.'),
  right: TableBorderSchema.optional().describe('Optional right-side border candidate.'),
  bottom: TableBorderSchema.optional().describe('Optional bottom-side border candidate.'),
  left: TableBorderSchema.optional().describe('Optional left-side border candidate.'),
}).describe('Optional physical-side border candidates for one Table Cell.');

/** Table Cell defaults 的稀疏物理侧边框片段，null 用于清除低优先级候选 */
export const TableCellBordersDefaultsSchema = strictObject({
  top: TableBorderSchema.nullable().optional().describe('Optional top-side border candidate or null to clear defaults.'),
  right: TableBorderSchema.nullable().optional().describe('Optional right-side border candidate or null to clear defaults.'),
  bottom: TableBorderSchema.nullable().optional().describe('Optional bottom-side border candidate or null to clear defaults.'),
  left: TableBorderSchema.nullable().optional().describe('Optional left-side border candidate or null to clear defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell border defaults'))
  .describe('Sparse physical-side border defaults for an existing Table Cell.');

export const TableOuterBordersSchema = strictObject({
  top: TableBorderSchema.optional().describe('Optional top-side outer border candidate.'),
  right: TableBorderSchema.optional().describe('Optional right-side outer border candidate.'),
  bottom: TableBorderSchema.optional().describe('Optional bottom-side outer border candidate.'),
  left: TableBorderSchema.optional().describe('Optional left-side outer border candidate.'),
}).describe('Sparse physical-side candidates for the Table outer boundary.');

/** Table outer defaults 的稀疏物理侧片段，null 用于清除低优先级候选 */
export const TableOuterBordersDefaultsSchema = strictObject({
  top: TableBorderSchema.nullable().optional().describe('Optional top-side outer candidate or null to clear defaults.'),
  right: TableBorderSchema.nullable().optional().describe('Optional right-side outer candidate or null to clear defaults.'),
  bottom: TableBorderSchema.nullable().optional().describe('Optional bottom-side outer candidate or null to clear defaults.'),
  left: TableBorderSchema.nullable().optional().describe('Optional left-side outer candidate or null to clear defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table outer border defaults'))
  .describe('Sparse physical-side defaults for the Table outer boundary.');

export const TableBordersSchema = strictObject({
  mode: TableBorderModeSchema.optional().describe('Border topology mode. Omitted fields use collapse.'),
  outer: TableOuterBordersSchema.optional().describe('Optional physical-side outer-boundary defaults.'),
  horizontal: TableBorderSchema.optional().describe('Optional internal row-boundary default candidate.'),
  vertical: TableBorderSchema.optional().describe('Optional internal column-boundary default candidate.'),
}).describe('Table-wide border topology and default candidates.');

/** Table defaults 的边框布局片段，null 用于清除低优先级模式或候选 */
export const TableBordersDefaultsSchema = strictObject({
  mode: TableBorderModeSchema.nullable().optional().describe('Optional border topology mode or null to clear defaults.'),
  outer: TableOuterBordersDefaultsSchema.nullable().optional().describe('Optional outer-boundary defaults.'),
  horizontal: TableBorderSchema.nullable().optional().describe('Optional horizontal candidate or null to clear defaults.'),
  vertical: TableBorderSchema.nullable().optional().describe('Optional vertical candidate or null to clear defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table border defaults'))
  .describe('Sparse Table border defaults for existing Table edges.');
