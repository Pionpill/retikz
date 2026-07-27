import type { ValueOf } from '@retikz/core';

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

/** Table Cell 来源的判别值 */
export const TableCellSourceKind = {
  /** 来自 manual structure 的显式 Cell */
  Manual: 'manual',
  /** 来自外部数据字段 */
  Field: 'field',
  /** 由 structure definition 生成 */
  Generated: 'generated',
} as const;

/** Table Cell 来源判别值 */
export type TableCellSourceKindValue = ValueOf<typeof TableCellSourceKind>;

/** Cell 最小来源信息 schema */
export const TableCellSourceSchema = z
  .union([
    z.strictObject({
      kind: z
        .literal(TableCellSourceKind.Manual)
        .describe('Discriminator for a source Cell authored by manual structure input.'),
      cellIndex: z.number().int().nonnegative().describe('Index of the source Cell in the manual operation.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellSourceKind.Field)
        .describe('Discriminator for a Cell derived from an external data field.'),
      reference: z.string().min(1).describe('External dataset reference used by the Table root.'),
      sourceIndex: z.number().int().nonnegative().describe('Stable source row index in the external dataset.'),
      field: z.string().min(1).describe('Non-empty field name or dotted path read from the source row.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellSourceKind.Generated)
        .describe('Discriminator for content synthesized by a structure definition.'),
      structureKind: z.string().min(1).describe('Structure provider kind that generated the Cell.'),
    }),
  ])
  .describe('Runtime-only Table Cell source identity.');

/** Structure Definition runtime output 的完整 guard */
export const TableStructureOutputSchema = z
  .strictObject({
    rows: z
      .array(
        z.strictObject({
          id: z.string().min(1).describe('Stable row id supplied by the structure definition.'),
          kind: TableRowKindSchema.describe('Semantic row kind.'),
          sourceIndex: z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe('Optional external source row index for a body row.'),
        }),
      )
      .describe('Ordered canonical row candidates.'),
    columns: z
      .array(
        z.strictObject({
          id: z.string().min(1).describe('Stable column id supplied by the structure definition.'),
          field: z.string().min(1).optional().describe('Optional external field bound to the column.'),
        }),
      )
      .describe('Ordered canonical column candidates.'),
    cells: z
      .array(
        z.strictObject({
          id: z.string().min(1).describe('Stable Cell id supplied by the structure definition.'),
          row: z.number().int().nonnegative().describe('Zero-based index into output rows.'),
          column: z.number().int().nonnegative().describe('Zero-based index into output columns.'),
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
