import { CssColorSchema, FontSchema, OpacitySchema, PaintValueSchema } from '@retikz/core';
import { z } from 'zod';

import { TableLineBorderSchema } from '../border';
import { TableStyle, TableThemeMode } from './constants';

const nonBlankColorSchema = CssColorSchema.refine(value => value.trim().length > 0, {
  message: 'Table style color must not be empty or whitespace.',
});

export const TableStyleBorderTokenSchema = TableLineBorderSchema.omit({ priority: true }).describe(
  'Table style border line without public conflict priority.',
);

const ScopeColorSchema = nonBlankColorSchema.nullable();

const categoricalColorsSchema = z
  .array(nonBlankColorSchema)
  .min(1)
  .superRefine((colors, context) => {
    const seen = new Set<string>();
    colors.forEach((color, index) => {
      if (seen.has(color)) {
        context.addIssue({ code: 'custom', path: [index], message: 'Categorical colors must be unique.' });
      }
      seen.add(color);
    });
  });

const TableStyleTokenShape = {
  'cell.background.fill': PaintValueSchema.nullable(),
  'cell.background.fillOpacity': OpacitySchema.nullable(),
  'cell.content.color': ScopeColorSchema,
  'cell.content.font.family': FontSchema.shape.family.unwrap().nullable(),
  'cell.content.font.weight': FontSchema.shape.weight.unwrap().nullable(),
  'columnHeader.background.fill': PaintValueSchema.nullable(),
  'columnHeader.background.fillOpacity': OpacitySchema.nullable(),
  'columnHeader.content.color': ScopeColorSchema,
  'columnHeader.content.font.family': FontSchema.shape.family.unwrap().nullable(),
  'columnHeader.content.font.weight': FontSchema.shape.weight.unwrap().nullable(),
  'table.border.top': TableStyleBorderTokenSchema.nullable(),
  'table.border.right': TableStyleBorderTokenSchema.nullable(),
  'table.border.bottom': TableStyleBorderTokenSchema.nullable(),
  'table.border.left': TableStyleBorderTokenSchema.nullable(),
  'table.border.horizontal': TableStyleBorderTokenSchema.nullable(),
  'table.border.vertical': TableStyleBorderTokenSchema.nullable(),
  'columnHeader.border.bottom': TableStyleBorderTokenSchema.nullable(),
  'data.categorical': categoricalColorsSchema,
  'data.sequential': z.tuple([nonBlankColorSchema, nonBlankColorSchema]),
} as const;

const TableStyleTokenObjectSchema = z.strictObject(TableStyleTokenShape);

export const TableStyleTokenKeySchema = TableStyleTokenObjectSchema.keyof().describe(
  'Closed Table style token key vocabulary.',
);

const knownTokenKeys = new Set<string>(TableStyleTokenKeySchema.options);
const styleTokenKeyPreflight = z.record(z.string(), z.unknown()).superRefine((tokens, context) => {
  Object.keys(tokens)
    .filter(key => !knownTokenKeys.has(key))
    .sort()
    .forEach(key => {
      context.addIssue({ code: 'custom', path: [key], message: `Unknown table style token "${key}"` });
    });
});

export const TableStyleTokenMapSchema = styleTokenKeyPreflight
  .pipe(TableStyleTokenObjectSchema)
  .describe('Complete required Table style token map.');

export const TableStyleTokensSchema = styleTokenKeyPreflight
  .pipe(TableStyleTokenObjectSchema.partial())
  .describe('Partial Table root style token overlay.');

export const TableStyleSchema = z.enum(TableStyle).describe('Built-in Table style preset.');

export const TableThemeModeSchema = z.enum(TableThemeMode).describe('Explicit Table style token mode.');
