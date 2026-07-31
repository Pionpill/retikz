import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { TableCellSelectorSchema } from '../rule';
import { TableVisualChannel } from './constants';

export const TableVisualScaleRefSchema = z
  .strictObject({
    name: z.string().min(1).describe('Registered Table Cell visual scale definition name.'),
    options: JsonObjectSchema.optional().describe('JSON-safe options parsed by the selected visual scale definition.'),
  })
  .describe('Reference to a registered Table Cell visual scale definition.');

export const TableCellVisualEncodingSchema = z
  .strictObject({
    id: z.string().min(1).describe('Stable visual encoding id unique within one Table.'),
    selector: TableCellSelectorSchema.describe('Value Cell candidates selected from the canonical Table model.'),
    channel: z.enum(TableVisualChannel).describe('Single Cell appearance color channel owned by this encoding.'),
    scale: TableVisualScaleRefSchema.describe('Visual scale used to map selected raw scalar values to colors.'),
    legend: z
      .union([
        z.literal(false),
        z.strictObject({
          title: z.string().optional().describe('Optional Table-owned title forwarded with the Legend descriptor.'),
        }),
      ])
      .optional()
      .describe('Explicit Legend descriptor opt-in; false or omission produces no descriptor.'),
  })
  .describe('Ordered Table Cell visual encoding over canonical raw scalar values.');
