import { JsonValueSchema } from '@retikz/core';
import { z } from 'zod';

import { RESERVED_TABLE_STRUCTURE_KINDS } from './constants';

/** JSON-safe 自定义 Table structure operation schema */
export const CustomTableStructureSchema = z
  .object({
    kind: z.string().min(1).describe('Custom Table structure provider kind.'),
  })
  .catchall(JsonValueSchema)
  .superRefine((operation, context) => {
    if ((RESERVED_TABLE_STRUCTURE_KINDS as ReadonlyArray<string>).includes(operation.kind)) {
      context.addIssue({
        code: 'custom',
        path: ['kind'],
        message: `Table structure kind "${operation.kind}" is reserved`,
        continue: false,
      });
    }
  })
  .describe('JSON-safe custom Table structure operation resolved by a registered definition.');
