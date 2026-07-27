import { BoxSpacingSchema, ChildSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { z } from 'zod';

import { TableCellBordersSchema } from '../border';
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

export const TableCellAddressSchema = z
  .strictObject({
    row: z.number().int().nonnegative().describe('Zero-based row index in the structure output.'),
    column: z.number().int().nonnegative().describe('Zero-based column index in the structure output.'),
  })
  .describe('Zero-based Table Cell address.');

export const TableCellLocationSchema = z
  .enum(TableCellLocation)
  .describe('Semantic Table region occupied by the Cell.');

export const TableCellRoleSchema = z.enum(TableCellRole).describe('Semantic role assigned to a Table Cell.');

export const TableHorizontalAlignmentSchema = z
  .enum(TableHorizontalAlignment)
  .describe('Horizontal alignment of content inside a Table Cell content box.');

export const TableVerticalAlignmentSchema = z
  .enum(TableVerticalAlignment)
  .describe('Vertical alignment of content inside a Table Cell content box.');

export const TableCellFitSchema = z.enum(TableCellFit).describe('Final content scaling policy inside a Table Cell.');

export const TableCellOverflowSchema = z
  .enum(TableCellOverflow)
  .describe('Visible or clipped overflow policy for Table Cell content.');

export const TableCellSpanSchema = z
  .strictObject({
    rows: z.number().int().positive().optional().describe('Positive number of consecutive rows covered by the Cell.'),
    columns: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Positive number of consecutive columns covered by the Cell.'),
  })
  .describe('Optional rectangular Table Cell span; omitted axes use 1 at runtime.');

export const TableCellLayoutSchema = z
  .strictObject({
    padding: z
      .union([z.number().nonnegative(), BoxSpacingSchema])
      .optional()
      .describe('Nonnegative uniform or per-side padding inside the Table Cell box.'),
    horizontalAlign: TableHorizontalAlignmentSchema.optional().describe(
      'Horizontal content alignment. Omitted fields use center at runtime.',
    ),
    verticalAlign: TableVerticalAlignmentSchema.optional().describe(
      'Vertical content alignment. Omitted fields use center at runtime.',
    ),
    wrap: z
      .boolean()
      .optional()
      .describe('Whether to request width-constrained child layout. Omitted fields use false.'),
    fit: TableCellFitSchema.optional().describe('Final content scaling policy. Omitted fields use none at runtime.'),
    overflow: TableCellOverflowSchema.optional().describe(
      'Content overflow policy. Omitted fields use visible at runtime.',
    ),
    borders: TableCellBordersSchema.optional().describe('Optional per-side Table Cell border candidates.'),
  })
  .describe('Table Cell padding, alignment, reflow, fit, overflow, and border options.');

export const TableCellValuePayloadSchema = z
  .strictObject({
    kind: z.literal(TableCellPayloadKind.Value).describe('Discriminator for a scalar value Cell payload.'),
    value: ScalarValueSchema.describe('JSON scalar value presented as Core content at runtime.'),
    presentation: TablePresentationRefSchema.optional().describe(
      'Optional presentation provider reference. Omitted fields use the built-in text presentation.',
    ),
  })
  .describe('Scalar value Cell payload resolved through the presentation registry.');

export const TableCellContentPayloadSchema = z
  .strictObject({
    kind: z.literal(TableCellPayloadKind.Content).describe('Discriminator for a direct Core child Cell payload.'),
    content: ChildSchema.describe('Direct JSON-safe Core or Tier 2 child authored in Cell-local coordinates.'),
  })
  .describe('Direct Core child Cell payload that bypasses value presentation.');

export const TableCellPayloadSchema = z
  .discriminatedUnion('kind', [TableCellValuePayloadSchema, TableCellContentPayloadSchema])
  .describe('Table Cell payload: a scalar value presentation or direct Core child content.');

export const TableCellSchema = z
  .strictObject({
    id: z.string().min(1).optional().describe('Optional stable Cell id. Omitted fields use an address-derived id.'),
    address: TableCellAddressSchema.describe('Zero-based Cell address in the manual structure.'),
    payload: TableCellPayloadSchema.describe('Cell value or direct Core content.'),
    location: TableCellLocationSchema.optional().describe(
      'Optional semantic location. Omitted fields derive from the containing row kind.',
    ),
    roles: z
      .array(TableCellRoleSchema)
      .min(1)
      .optional()
      .describe('Optional semantic roles. Omitted fields derive from the containing row kind.'),
    span: TableCellSpanSchema.optional().describe('Optional rectangular Cell span. Omitted fields use 1 × 1.'),
    layout: TableCellLayoutSchema.optional().describe('Optional Cell layout policy with runtime defaults.'),
  })
  .describe('Explicit Cell authored by a manual Table structure.');
