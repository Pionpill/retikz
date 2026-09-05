import { CssColorSchema, FontSchema, OpacitySchema, PaintValueSchema } from '@retikz/core';
import { array, strictObject, tuple } from 'zod';

import { TableLineBorderSchema } from '../border';
import { TableThemeToken } from './constants';

export const TableThemeTokenBorderSchema = TableLineBorderSchema.omit({ priority: true }).describe(
  'Table theme border line without public conflict priority.',
);

const ScopeColorSchema = CssColorSchema.nullable();

const categoricalColorsSchema = array(CssColorSchema).min(1, {
  message: 'Table categorical colors must be non-empty.',
});

const TableThemeTokenShape = {
  [TableThemeToken.CellBackgroundFill]: PaintValueSchema.nullable(),
  [TableThemeToken.CellBackgroundFillOpacity]: OpacitySchema.nullable(),
  [TableThemeToken.CellContentColor]: ScopeColorSchema,
  [TableThemeToken.CellContentFontFamily]: FontSchema.shape.family.unwrap().nullable(),
  [TableThemeToken.CellContentFontWeight]: FontSchema.shape.weight.unwrap().nullable(),
  [TableThemeToken.ColumnHeaderBackgroundFill]: PaintValueSchema.nullable(),
  [TableThemeToken.ColumnHeaderBackgroundFillOpacity]: OpacitySchema.nullable(),
  [TableThemeToken.ColumnHeaderContentColor]: ScopeColorSchema,
  [TableThemeToken.ColumnHeaderContentFontFamily]: FontSchema.shape.family.unwrap().nullable(),
  [TableThemeToken.ColumnHeaderContentFontWeight]: FontSchema.shape.weight.unwrap().nullable(),
  [TableThemeToken.TableBorderTop]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.TableBorderRight]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.TableBorderBottom]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.TableBorderLeft]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.TableBorderHorizontal]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.TableBorderVertical]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.ColumnHeaderBorderBottom]: TableThemeTokenBorderSchema.nullable(),
  [TableThemeToken.DataCategorical]: categoricalColorsSchema,
  [TableThemeToken.DataSequential]: tuple([CssColorSchema, CssColorSchema]),
} as const;

const TableThemeTokenObjectSchema = strictObject(TableThemeTokenShape);

export const TableThemeTokenKeySchema = TableThemeTokenObjectSchema.keyof().describe(
  'Closed Table theme token key vocabulary.',
);

export const TableThemeTokenMapSchema = TableThemeTokenObjectSchema.describe(
  'Complete required Table theme token map.',
);

export const TableThemeTokenOverridesSchema = TableThemeTokenObjectSchema.partial().describe(
  'Partial strict Table theme token overlay.',
);

export const TableThemeTokenPresetMapSchema = strictObject(TableThemeTokenShape)
  .omit({ [TableThemeToken.DataCategorical]: true })
  .describe('Complete Table preset map excluding the Core shared categorical projection.');

export const TableThemeStyleTokenOverridesSchema = TableThemeTokenPresetMapSchema.partial().describe(
  'Sparse strict Table style token overlay excluding the Core shared categorical projection.',
);
