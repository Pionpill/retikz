import { CompositeBaseSchema, JsonObjectSchema } from '@retikz/core';
import { DataReferenceSchema } from '@retikz/data';
import { z } from 'zod';

import { TableCellVisualEncodingSchema } from '../encoding';
import { TableLayoutSchema } from '../layout';
import { TableCellRuleSchema } from '../rule';
import { CustomTableStructureSchema, DetailTableStructureSchema, ManualTableStructureSchema } from '../structure';
import { TableThemeTokenOverridesSchema } from '../style';
import { TABLE_NAMESPACE, TableComposite } from './constants';

const TableBaseSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(TABLE_NAMESPACE)
    .describe('Tier 2 namespace that routes this node to the Table composite definition.'),
  type: z.literal(TableComposite.Table).describe('Composite type for the top-level Table specification.'),
  id: z.string().min(1).optional().describe('Optional stable Table id used by the lowered root Scope.'),
  layout: TableLayoutSchema.optional().describe(
    'Two-dimensional Table track, gap, and border layout options. Omitted fields use the pipeline defaults.',
  ),
  meta: JsonObjectSchema.optional().describe('Opaque JSON-safe metadata preserved by Table lowering.'),
  rules: z.array(TableCellRuleSchema).optional().describe('Ordered root Cell rules applied by declaration order.'),
  encodings: z
    .array(TableCellVisualEncodingSchema)
    .optional()
    .describe('Ordered Table Cell visual encodings. Omission is runtime-equivalent to an empty array.'),
  tableThemeTokens: TableThemeTokenOverridesSchema.optional().describe(
    'Partial strict Table token overlay applied after inherited Theme tokens.',
  ),
});

type TableRootSemanticInput = Readonly<{
  id?: string;
  encodings?: ReadonlyArray<Readonly<{ id: string; legend?: false | Readonly<{ title?: string }> }>>;
}>;

const validateTableRoot = (spec: TableRootSemanticInput, context: z.RefinementCtx): void => {
  const seen = new Set<string>();
  spec.encodings?.forEach((encoding, index) => {
    if (seen.has(encoding.id)) {
      context.addIssue({ code: 'custom', path: ['encodings', index, 'id'], message: 'duplicate Table encoding id' });
    }
    seen.add(encoding.id);
  });
  if (spec.id === undefined && spec.encodings?.some(encoding => typeof encoding.legend === 'object')) {
    context.addIssue({ code: 'custom', path: ['id'], message: 'Table root id is required for Legend descriptors' });
  }
};

export const DetailTableSchema = TableBaseSchema.extend({
  data: DataReferenceSchema.describe(
    'External dataset reference required by this detail Table. Actual rows stay outside the IR.',
  ),
  structure: DetailTableStructureSchema.describe('Record-per-row detail structure for this Table.'),
})
  .superRefine(validateTableRoot)
  .describe('JSON-safe detail Table composite specification bound to external data.');

export const ManualTableSchema = TableBaseSchema.extend({
  data: z.never().optional().describe('Manual Table specifications do not accept an external dataset reference.'),
  structure: ManualTableStructureSchema.describe('Explicit row-major Cell matrix for this manual Table.'),
})
  .superRefine(validateTableRoot)
  .describe('JSON-safe manual Table composite specification with explicit content.');

export const CustomTableSchema = TableBaseSchema.extend({
  data: DataReferenceSchema.optional().describe(
    'Optional external dataset reference exposed to the selected custom structure definition at runtime.',
  ),
  structure: CustomTableStructureSchema.describe('Custom Table structure operation resolved through the registry.'),
})
  .superRefine(validateTableRoot)
  .describe('JSON-safe custom Table composite specification resolved by a structure definition.');

export const TableSchema = z
  .union([DetailTableSchema, ManualTableSchema, CustomTableSchema])
  .describe('JSON-safe Table composite specification covering the supported precise root variants.');
