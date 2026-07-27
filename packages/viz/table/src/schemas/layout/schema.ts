import { z } from 'zod';

import { TableBordersSchema } from '../border';
import { TableTrackSizeKind } from './constants';

const NonnegativeGapSchema = z.number().nonnegative();

export const TableTrackSizeKindSchema = z
  .enum(TableTrackSizeKind)
  .describe('Discriminator for a Table track sizing variant.');

export const TableFixedTrackSizeSchema = z
  .strictObject({
    kind: z.literal(TableTrackSizeKind.Fixed).describe('Discriminator for an explicit fixed track size.'),
    value: z.number().nonnegative().describe('Nonnegative fixed track size.'),
  })
  .describe('Table track with an explicit nonnegative size.');

export const TableAutoTrackSizeSchema = z
  .strictObject({
    kind: z.literal(TableTrackSizeKind.Auto).describe('Discriminator for a content-sized track.'),
  })
  .describe('Table track sized from its canonical content contribution.');

export const TableFractionTrackSizeSchema = z
  .strictObject({
    kind: z.literal(TableTrackSizeKind.Fraction).describe('Discriminator for a fractional track.'),
    weight: z.number().positive().optional().describe('Positive flex weight. Omitted fields use 1 at runtime.'),
  })
  .describe('Table track that receives a weighted share of constrained remaining space.');

const TableMinTrackSizeSchema = z.union([TableFixedTrackSizeSchema, TableAutoTrackSizeSchema]);
const TableMaxTrackSizeSchema = z.union([
  TableFixedTrackSizeSchema,
  TableAutoTrackSizeSchema,
  TableFractionTrackSizeSchema,
]);

export const TableMinmaxTrackSizeSchema = z
  .strictObject({
    kind: z.literal(TableTrackSizeKind.Minmax).describe('Discriminator for a bounded Table track.'),
    min: TableMinTrackSizeSchema.describe('Fixed or content-derived lower track bound.'),
    max: TableMaxTrackSizeSchema.describe('Fixed, content-derived, or fractional upper track bound.'),
  })
  .superRefine((track, context) => {
    if (
      track.min.kind === TableTrackSizeKind.Fixed &&
      track.max.kind === TableTrackSizeKind.Fixed &&
      track.min.value > track.max.value
    ) {
      context.addIssue({
        code: 'custom',
        path: ['max', 'value'],
        message: 'fixed max must be greater than or equal to fixed min',
      });
    }
  })
  .describe('Table track constrained by explicit minimum and maximum sizing variants.');

export const TableTrackSizeSchema = z
  .discriminatedUnion('kind', [
    TableFixedTrackSizeSchema,
    TableAutoTrackSizeSchema,
    TableFractionTrackSizeSchema,
    TableMinmaxTrackSizeSchema,
  ])
  .describe('Table track size: fixed, auto, fraction, or minmax.');

export const TableTrackOverrideSchema = z
  .strictObject({
    index: z.number().int().nonnegative().describe('Canonical zero-based track index.'),
    size: TableTrackSizeSchema.describe('Track size that replaces the axis default at this index.'),
  })
  .describe('Sparse Table track-size override addressed by canonical index.');

export const TableTrackOverridesSchema = z
  .array(TableTrackOverrideSchema)
  .superRefine((overrides, context) => {
    const indexes = new Set<number>();
    overrides.forEach((override, index) => {
      if (indexes.has(override.index)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'index'],
          message: `duplicate Table track override index ${override.index}`,
        });
      }
      indexes.add(override.index);
    });
  })
  .describe('Sparse Table track-size overrides with unique canonical indexes.');

export const TableLayoutSchema = z
  .strictObject({
    columnSize: TableTrackSizeSchema.optional().describe('Default column track size. Omitted fields use fixed 120.'),
    rowSize: TableTrackSizeSchema.optional().describe('Default body row track size. Omitted fields use fixed 32.'),
    headerRowSize: TableTrackSizeSchema.optional().describe(
      'Default column-header row size. Omitted fields use the resolved rowSize.',
    ),
    columns: TableTrackOverridesSchema.optional().describe('Sparse canonical column-size overrides.'),
    rows: TableTrackOverridesSchema.optional().describe('Sparse canonical row-size overrides.'),
    columnGap: NonnegativeGapSchema.optional().describe(
      'Nonnegative finite gap between adjacent columns. Omitted fields use 0.',
    ),
    rowGap: NonnegativeGapSchema.optional().describe(
      'Nonnegative finite gap between adjacent rows. Omitted fields use 0.',
    ),
    borders: TableBordersSchema.optional().describe('Optional Table border topology and defaults.'),
  })
  .describe('Table track sizing, gaps, and border layout options without materialized defaults.');
