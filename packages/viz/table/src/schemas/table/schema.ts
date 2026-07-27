import { CompositeBaseSchema, JsonObjectSchema } from '@retikz/core';
import { DataReferenceSchema } from '@retikz/data';
import { z } from 'zod';

import { TableLayoutSchema } from '../layout';
import { CustomTableStructureSchema, DetailTableStructureSchema, ManualTableStructureSchema } from '../structure';
import { TABLE_NAMESPACE, TableComposite } from './constants';

const TableSpecBaseSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(TABLE_NAMESPACE)
    .describe('Tier 2 namespace that routes this node to the Table composite definition.'),
  type: z.literal(TableComposite.Table).describe('Composite type for the top-level Table specification.'),
  id: z.string().min(1).optional().describe('Optional stable Table id used by the lowered root Scope.'),
  layout: TableLayoutSchema.optional().describe(
    'Two-dimensional Table track, gap, and border layout options. Omitted fields use the pipeline defaults.',
  ),
  meta: JsonObjectSchema.optional().describe('Opaque JSON-safe metadata preserved by Table lowering.'),
});

export const DetailTableSpecSchema = TableSpecBaseSchema.extend({
  data: DataReferenceSchema.describe(
    'External dataset reference required by this detail Table. Actual rows stay outside the IR.',
  ),
  structure: DetailTableStructureSchema.describe('Record-per-row detail structure for this Table.'),
}).describe('JSON-safe detail Table composite specification bound to external data.');

export const ManualTableSpecSchema = TableSpecBaseSchema.extend({
  data: z.never().optional().describe('Manual Table specifications do not accept an external dataset reference.'),
  structure: ManualTableStructureSchema.describe('Explicit rows, columns, and Cells for this manual Table.'),
}).describe('JSON-safe manual Table composite specification with explicit content.');

export const CustomTableSpecSchema = TableSpecBaseSchema.extend({
  data: DataReferenceSchema.optional().describe(
    'Optional external dataset reference exposed to the selected custom structure definition at runtime.',
  ),
  structure: CustomTableStructureSchema.describe('Custom Table structure operation resolved through the registry.'),
}).describe('JSON-safe custom Table composite specification resolved by a structure definition.');

export const TableSpecSchema = z
  .union([DetailTableSpecSchema, ManualTableSpecSchema, CustomTableSpecSchema])
  .describe('JSON-safe Table composite specification covering the supported precise root variants.');
