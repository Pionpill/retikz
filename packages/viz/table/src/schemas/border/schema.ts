import { OpacitySchema, PaintValueSchema } from '@retikz/core';
import { z } from 'zod';

import { TableBorderKind, TableBorderMode } from './constants';

export const TableBorderKindSchema = z.enum(TableBorderKind).describe('Discriminator for a Table border candidate.');

export const TableBorderModeSchema = z
  .enum(TableBorderMode)
  .describe('Shared-edge collapse or per-Cell separate mode.');

const TableBorderPrioritySchema = z
  .number()
  .refine(Number.isInteger, { message: 'Border priority must be a finite integer.' });

export const TableNoBorderSchema = z
  .strictObject({
    kind: z.literal(TableBorderKind.None).describe('Discriminator for an explicit hidden border candidate.'),
    priority: TableBorderPrioritySchema.optional().describe('Finite integer conflict priority. Omitted fields use 0.'),
  })
  .describe('Explicit Table border suppression candidate.');

export const TableLineBorderSchema = z
  .strictObject({
    kind: z.literal(TableBorderKind.Line).describe('Discriminator for a Table line border candidate.'),
    stroke: PaintValueSchema.refine(value => value !== 'none', {
      message: 'Table border stroke must not be none.',
    })
      .optional()
      .describe('Core paint for the border line. Omitted fields use currentColor.'),
    width: z.number().nonnegative().optional().describe('Nonnegative border width. Omitted fields use 1.'),
    strokeOpacity: OpacitySchema.optional().describe('Border stroke opacity. Omitted fields use 1.'),
    dashPattern: z
      .array(z.number().positive())
      .min(1)
      .optional()
      .describe('Optional non-empty positive dash pattern; omission means solid.'),
    dashOffset: z.number().optional().describe('Finite dash offset. Omitted fields use 0.'),
    priority: TableBorderPrioritySchema.optional().describe('Finite integer conflict priority. Omitted fields use 0.'),
  })
  .describe('Core-compatible Table line border candidate.');

export const TableBorderSchema = z
  .discriminatedUnion('kind', [TableNoBorderSchema, TableLineBorderSchema])
  .describe('Table border candidate: explicit none or a complete line source.');

export const TableCellBordersSchema = z
  .strictObject({
    top: TableBorderSchema.optional().describe('Optional top-side border candidate.'),
    right: TableBorderSchema.optional().describe('Optional right-side border candidate.'),
    bottom: TableBorderSchema.optional().describe('Optional bottom-side border candidate.'),
    left: TableBorderSchema.optional().describe('Optional left-side border candidate.'),
  })
  .describe('Optional physical-side border candidates for one Table Cell.');

export const TableBordersSchema = z
  .strictObject({
    mode: TableBorderModeSchema.optional().describe('Border topology mode. Omitted fields use collapse.'),
    outer: TableBorderSchema.optional().describe('Optional outer-boundary default candidate.'),
    horizontal: TableBorderSchema.optional().describe('Optional internal row-boundary default candidate.'),
    vertical: TableBorderSchema.optional().describe('Optional internal column-boundary default candidate.'),
  })
  .describe('Table-wide border topology and default candidates.');
