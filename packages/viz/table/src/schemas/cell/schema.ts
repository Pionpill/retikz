import { ChildSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { z } from 'zod';

import { TablePresentationRefSchema } from '../presentation';
import { TableCellLocation, TableCellPayloadKind, TableCellRole } from './constants';

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
  })
  .describe('Explicit Cell authored by a manual Table structure.');
