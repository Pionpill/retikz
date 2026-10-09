import { CssColorSchema } from '@retikz/core';
import { array, strictObject, tuple } from 'zod';

import { TableAppearanceDefaultsSchema } from '../appearance';
import { TableBordersDefaultsSchema } from '../border';
import { TableCellLayoutSchema } from '../cell';

/** Table Source 的非空分类颜色默认序列 */
export const TableCategoricalPaletteSchema = array(CssColorSchema)
  .min(1)
  .describe('Non-empty categorical color palette used by existing Table visual encodings.');

/** Table Source 的连续颜色端点默认序列 */
export const TableSequentialPaletteSchema = tuple([CssColorSchema, CssColorSchema]).describe(
  'Two endpoint colors used by existing Table sequential visual encodings.',
);

/** Table Source 的 visual encoding 默认片段 */
export const TableVisualDefaultsSchema = strictObject({
  categorical: TableCategoricalPaletteSchema.nullable().optional().describe('Default categorical color palette.'),
  sequential: TableSequentialPaletteSchema.nullable().optional().describe('Default sequential color endpoints.'),
})
  .refine(value => Object.keys(value).length > 0, {
    message: 'Table visual defaults must contain at least one field.',
  })
  .describe('Sparse defaults for existing Table builtin visual scale ranges.');

/** Table Source 的 layout 默认片段，只保留表格边界候选 */
export const TableLayoutDefaultsSchema = strictObject({
  borders: TableBordersDefaultsSchema.nullable().optional().describe('Optional Table border defaults.'),
})
  .refine(value => Object.keys(value).length > 0, {
    message: 'Table layout defaults must contain at least one field.',
  })
  .describe('Sparse Table layout defaults restricted to border topology and candidates.');

export const TableCellPaddingDefaultsSchema = strictObject({
  padding: TableCellLayoutSchema.shape.padding
    .nullable()
    .describe('Default Cell padding, replaced as one spacing value; null clears lower defaults.'),
})
  .refine(value => Object.keys(value).length > 0, { message: 'Cell padding defaults must contain a field.' })
  .describe('Sparse padding defaults for an existing Table Cell.');

export const TableCellLayoutDefaultsSchema = strictObject({
  body: TableCellPaddingDefaultsSchema.nullable().optional().describe('Padding defaults for existing body Cells.'),
  columnHeader: TableCellPaddingDefaultsSchema.nullable()
    .optional()
    .describe('Padding defaults for existing column-header Cells.'),
})
  .refine(value => Object.keys(value).length > 0, { message: 'Cell layout defaults must contain a region.' })
  .describe('Sparse Cell padding defaults grouped by location; explicit Cell padding takes precedence.');

/** Table Source 的 Table defaults 聚合片段 */
export const TableDefaultsSchema = strictObject({
  cellLayoutDefaults: TableCellLayoutDefaultsSchema.nullable().optional(),
  appearanceDefaults: TableAppearanceDefaultsSchema.nullable()
    .optional()
    .describe('Default appearance for existing Cell regions.'),
  layout: TableLayoutDefaultsSchema.nullable().optional().describe('Default Table border layout.'),
  visualDefaults: TableVisualDefaultsSchema.nullable()
    .optional()
    .describe('Default ranges for existing visual encodings.'),
}).describe('Sparse Table defaults restricted to existing appearance, Cell padding, border, and visual scale fields.');
