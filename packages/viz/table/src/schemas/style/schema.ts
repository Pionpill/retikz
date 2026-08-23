import { CssColorSchema, FontSchema, OpacitySchema, PaintValueSchema } from '@retikz/core';
import { z } from 'zod';

import { TableLineBorderSchema } from '../border';
import { TableThemeToken } from './constants';

export const TableThemeTokenBorderSchema = TableLineBorderSchema.omit({ priority: true }).describe(
  'Table theme border line without public conflict priority.',
);

const ScopeColorSchema = CssColorSchema.nullable();

const categoricalColorsSchema = z.array(CssColorSchema).min(1, {
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
  [TableThemeToken.DataSequential]: z.tuple([CssColorSchema, CssColorSchema]),
} as const;

const TableThemeTokenObjectSchema = z.strictObject(TableThemeTokenShape);

export const TableThemeTokenKeySchema = TableThemeTokenObjectSchema.keyof().describe(
  'Closed Table theme token key vocabulary.',
);

const knownTokenKeys = new Set<string>(TableThemeTokenKeySchema.options);
const themeTokenKeyPreflight = z.record(z.string(), z.unknown()).superRefine((tokens, context) => {
  Object.keys(tokens)
    .filter(key => !knownTokenKeys.has(key))
    .sort()
    .forEach(key => {
      context.addIssue({ code: 'custom', path: [key], message: `Unknown table theme token "${key}"` });
    });
});

export const TableThemeTokenMapSchema = themeTokenKeyPreflight
  .pipe(TableThemeTokenObjectSchema)
  .describe('Complete required Table theme token map.');

export const TableThemeTokenOverridesSchema = themeTokenKeyPreflight
  .pipe(TableThemeTokenObjectSchema.partial())
  .superRefine((overrides, context) => {
    for (const key of TableThemeTokenKeySchema.options) {
      if (Object.hasOwn(overrides, key) && overrides[key] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Table theme token overrides must omit unset values instead of using undefined',
        });
      }
    }
  })
  .describe('Partial strict Table theme token overlay.');

export const TableThemeTokenPresetMapSchema = z
  .strictObject(TableThemeTokenShape)
  .omit({ [TableThemeToken.DataCategorical]: true })
  .describe('Complete Table preset map excluding the Core shared categorical projection.');
