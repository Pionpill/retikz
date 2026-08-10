import { BoxSpacingSchema, ChildSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { NonNegativeNumberSchema, PositiveIntegerSchema } from '@retikz/foundation';
import { z } from 'zod';

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
    rows: PositiveIntegerSchema.optional().describe('Positive number of consecutive rows covered by the Cell.'),
    columns: PositiveIntegerSchema.optional().describe('Positive number of consecutive columns covered by the Cell.'),
  })
  .describe('Optional rectangular Table Cell span; omitted axes use 1 at runtime.');

export const TableCellLayoutSchema = z
  .strictObject({
    padding: z
      .union([NonNegativeNumberSchema, BoxSpacingSchema])
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
    formatter: TableFormatterRefSchema.optional().describe(
      'Optional formatter provider reference. Omitted fields use the built-in identity formatter.',
    ),
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

const ManualTableCellSharedShape = {
  id: z.string().min(1).optional().describe('Optional stable Cell id. Omitted fields use an address-derived id.'),
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
};

export const ManualTableValueCellSchema = z
  .strictObject({
    ...ManualTableCellSharedShape,
    value: ScalarValueSchema.describe('JSON scalar value presented as Core content at runtime.'),
    formatter: TableFormatterRefSchema.optional().describe(
      'Optional formatter provider reference. Omitted fields use the built-in identity formatter.',
    ),
    presentation: TablePresentationRefSchema.optional().describe(
      'Optional presentation provider reference. Omitted fields use the built-in text presentation.',
    ),
  })
  .describe('Manual Table Cell authored from a scalar value.');

export const ManualTableContentCellSchema = z
  .strictObject({
    ...ManualTableCellSharedShape,
    content: ChildSchema.describe('Direct JSON-safe Core or Tier 2 child authored in Cell-local coordinates.'),
  })
  .describe('Manual Table Cell authored from direct Core child content.');

export const ManualTableCellSchema = z
  .union([
    z.string().describe('String shorthand for a value Cell.'),
    z.number().describe('Number shorthand for a value Cell.'),
    z.boolean().describe('Boolean shorthand for a value Cell.'),
    ManualTableValueCellSchema,
    ManualTableContentCellSchema,
  ])
  .describe('Manual Table Cell entry authored as scalar shorthand or a rich value/content object.');
