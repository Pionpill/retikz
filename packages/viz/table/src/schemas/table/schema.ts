import { CompositeBaseSchema, JsonObjectSchema } from '@retikz/core';
import { DataReferenceSchema } from '@retikz/data';
import { z } from 'zod';

import { TableLayoutSchema } from '../layout';
import { TableStructureSchema } from '../structure';
import { TABLE_NAMESPACE, TableComposite } from './constants';

/** Table composite 根节点 schema */
export const TableSpecSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(TABLE_NAMESPACE)
    .describe('Tier 2 namespace that routes this node to the Table composite definition.'),
  type: z.literal(TableComposite.Table).describe('Composite type for the top-level Table specification.'),
  id: z.string().min(1).optional().describe('Optional stable Table id used by the lowered root Scope.'),
  data: DataReferenceSchema.optional().describe(
    'External dataset reference. Actual rows stay outside the IR and are supplied to the Table pipeline at runtime.',
  ),
  structure: TableStructureSchema.describe('Table structure operation consumed by the selected structure definition.'),
  layout: TableLayoutSchema.optional().describe(
    'Fixed-track Table layout options. Omitted fields use the pipeline defaults.',
  ),
  meta: JsonObjectSchema.optional().describe('Opaque JSON-safe metadata preserved by Table lowering.'),
})
  .superRefine((spec, context) => {
    if (spec.structure.kind === 'detail' && spec.data === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['data'],
        message: 'detail Table structure requires an external data reference',
      });
    }
    if (spec.structure.kind === 'manual' && spec.data !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['data'],
        message: 'manual Table structure does not consume external data',
      });
    }
  })
  .describe('JSON-safe Table composite specification with external data binding.');
