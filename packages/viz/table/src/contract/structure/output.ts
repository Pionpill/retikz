import { NonBlankStringSchema, NonNegativeIntegerSchema } from '@retikz/foundation';
import { z } from 'zod';

import type { DeepReadonly } from '../../shared';

import {
  TableCellLayoutSchema,
  TableCellLocationSchema,
  TableCellPayloadSchema,
  TableCellRoleSchema,
  TableCellSpanSchema,
  TableRowKindSchema,
} from '../../schemas';
import { TableCellSourceKind } from '../../shared';

/** Cell 最小来源信息 schema */
export const TableCellSourceSchema = z
  .union([
    z.strictObject({
      kind: z
        .literal(TableCellSourceKind.Manual)
        .describe('Discriminator for a source Cell authored by manual structure input.'),
      row: NonNegativeIntegerSchema.describe('Zero-based row of the source entry in the manual matrix.'),
      column: NonNegativeIntegerSchema.describe('Zero-based column of the source entry in the manual matrix.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellSourceKind.Field)
        .describe('Discriminator for a Cell derived from an external data field.'),
      reference: NonBlankStringSchema.describe('External dataset reference used by the Table root.'),
      sourceIndex: NonNegativeIntegerSchema.describe('Stable source row index in the external dataset.'),
      field: NonBlankStringSchema.describe('Non-blank field name or dotted path read from the source row.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellSourceKind.Generated)
        .describe('Discriminator for content synthesized by a structure definition.'),
      structureKind: NonBlankStringSchema.describe('Structure provider kind that generated the Cell.'),
    }),
  ])
  .describe('Runtime-only Table Cell source identity.');

/** Structure Definition runtime output 的完整 guard */
export const TableStructureOutputSchema = z
  .strictObject({
    rows: z
      .array(
        z.strictObject({
          id: NonBlankStringSchema.describe('Stable row id supplied by the structure definition.'),
          kind: TableRowKindSchema.describe('Semantic row kind.'),
          sourceIndex: NonNegativeIntegerSchema.optional().describe(
            'Optional external source row index for a body row.',
          ),
        }),
      )
      .describe('Ordered canonical row candidates.'),
    columns: z
      .array(
        z.strictObject({
          id: NonBlankStringSchema.describe('Stable column id supplied by the structure definition.'),
          field: NonBlankStringSchema.optional().describe('Optional external field bound to the column.'),
        }),
      )
      .describe('Ordered canonical column candidates.'),
    cells: z
      .array(
        z.strictObject({
          id: NonBlankStringSchema.describe('Stable Cell id supplied by the structure definition.'),
          row: NonNegativeIntegerSchema.describe('Zero-based index into output rows.'),
          column: NonNegativeIntegerSchema.describe('Zero-based index into output columns.'),
          payload: TableCellPayloadSchema.describe('Validated Cell value or direct Core content.'),
          location: TableCellLocationSchema.describe('Semantic Cell location.'),
          roles: z.array(TableCellRoleSchema).min(1).describe('Non-empty semantic Cell roles.'),
          span: TableCellSpanSchema.optional().describe('Optional rectangular Cell span normalized by the pipeline.'),
          layout: TableCellLayoutSchema.optional().describe('Optional Cell layout normalized by the pipeline.'),
          source: TableCellSourceSchema.optional().describe('Optional runtime-only Cell source identity.'),
        }),
      )
      .describe('Ordered canonical Cell candidates.'),
  })
  .describe('Validated runtime output produced by a Table structure definition.');

/** Cell 最小来源信息 */
export type TableCellSource = DeepReadonly<z.infer<typeof TableCellSourceSchema>>;

/** Structure Definition 的声明式 runtime output */
export type TableStructureOutput = DeepReadonly<z.output<typeof TableStructureOutputSchema>>;
