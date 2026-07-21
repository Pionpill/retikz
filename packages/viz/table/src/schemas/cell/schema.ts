import { z } from 'zod';

import { TableCellAddressSchema } from './address';
import { TableCellLocationSchema } from './location';
import { TableCellPayloadSchema } from './payload';
import { TableCellRoleSchema } from './role';

/** manual structure Cell schema */
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

/** manual structure Cell */
export type IRTableCell = z.infer<typeof TableCellSchema>;
