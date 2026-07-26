import { OpacitySchema, PaintValueSchema } from '@retikz/core';
import { z } from 'zod';

const TableBorderSideSchema = z.enum(['top', 'right', 'bottom', 'left']);
const TableBorderOrientationSchema = z.enum(['horizontal', 'vertical']);
const TableBorderPrioritySchema = z
  .number()
  .refine(Number.isInteger, { message: 'Border priority must be a finite integer.' });

const TableBorderVertexSchema = z.strictObject({
  x: z.number().describe('Finite Table-local x coordinate.'),
  y: z.number().describe('Finite Table-local y coordinate.'),
});

export const ResolvedTableBorderLineSchema = z.strictObject({
  stroke: PaintValueSchema.refine(value => value !== 'none', {
    message: 'Resolved border stroke must not be none.',
  }).describe('Resolved non-none Core paint for the border line.'),
  width: z.number().nonnegative().describe('Resolved nonnegative border width.'),
  strokeOpacity: OpacitySchema.describe('Resolved border stroke opacity.'),
  dashPattern: z
    .array(z.number().positive())
    .min(1)
    .optional()
    .describe('Optional non-empty positive dash pattern; omission means solid.'),
  dashOffset: z.number().describe('Resolved finite border dash offset.'),
  lineCap: z.literal('butt').describe('Canonical border line cap.'),
  lineJoin: z.literal('miter').describe('Canonical border line join.'),
});

const TableCellBorderSourceSchema = z.strictObject({
  kind: z.literal('cell').describe('Discriminator for a Cell-side border source.'),
  cellId: z.string().min(1).describe('Semantic Cell id retained for provenance.'),
  row: z.number().int().nonnegative().describe('Canonical origin row index.'),
  column: z.number().int().nonnegative().describe('Canonical origin column index.'),
  side: TableBorderSideSchema.describe('Physical Cell side that supplied the candidate.'),
});

const TableOuterBorderSourceSchema = z.strictObject({
  kind: z.literal('default').describe('Discriminator for a Table default border source.'),
  scope: z.literal('outer').describe('Outer-frame default scope.'),
  side: TableBorderSideSchema.describe('Table outer side that supplied the candidate.'),
});

const TableGridBorderSourceSchema = z.strictObject({
  kind: z.literal('default').describe('Discriminator for a Table default border source.'),
  scope: z.enum(['horizontal', 'vertical']).describe('Internal grid default scope.'),
  boundaryIndex: z.number().int().nonnegative().describe('Canonical internal boundary index.'),
});

export const TableBorderSourceSchema = z.union([
  TableCellBorderSourceSchema,
  TableOuterBorderSourceSchema,
  TableGridBorderSourceSchema,
]);

const TableBorderContributionBaseShape = {
  key: z.string().min(1).describe('Transaction-unique contribution key.'),
  source: TableBorderSourceSchema.describe('Canonical border candidate source.'),
  priority: TableBorderPrioritySchema.describe('Resolved finite conflict priority.'),
  specificity: z.union([z.literal(0), z.literal(1)]).describe('Default or Cell-side specificity rank.'),
  ownerSideRank: z.number().int().describe('Canonical physical owner-side rank.'),
  sourceOrderKey: z.string().min(1).describe('Canonical source ordering key independent of Cell id.'),
};

export const TableNoBorderContributionSchema = z.strictObject({
  kind: z.literal('none').describe('Discriminator for an explicit hidden border candidate.'),
  ...TableBorderContributionBaseShape,
});

export const TableLineBorderContributionSchema = z.strictObject({
  kind: z.literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  ...TableBorderContributionBaseShape,
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
});

export const TableBorderContributionSchema = z.discriminatedUnion('kind', [
  TableNoBorderContributionSchema,
  TableLineBorderContributionSchema,
]);

export const TableBorderManifestAtomSchema = z.strictObject({
  key: z.string().min(1).describe('Canonical atomic border key.'),
  winner: TableBorderContributionSchema.describe('Resolved atom winner.'),
  contributors: z.array(TableBorderContributionSchema).min(1).describe('Canonical ordered atom contributors.'),
});

export const TableBorderManifestEntrySchema = z.strictObject({
  key: z.string().min(1).describe('Canonical merged edge key.'),
  orientation: TableBorderOrientationSchema.describe('Edge orientation.'),
  start: TableBorderVertexSchema.describe('Table-local edge start.'),
  end: TableBorderVertexSchema.describe('Table-local edge end.'),
  style: ResolvedTableBorderLineSchema.describe('Resolved emitted line style.'),
  atoms: z.array(TableBorderManifestAtomSchema).min(1).describe('Canonical atomic provenance in edge order.'),
  pathId: z.string().min(1).optional().describe('Optional emitted Core Path id.'),
});

export const TableBorderPathMetaSchema = z.strictObject({
  kind: z.literal('tableBorder').describe('Discriminator for emitted Table border Path metadata.'),
  tableId: z.string().min(1).optional().describe('Optional owning Table id.'),
  edgeKey: z.string().min(1).describe('Canonical merged edge key.'),
  atomicKeys: z.array(z.string().min(1)).min(1).describe('Canonical atomic keys represented by the Path.'),
});

export const TableBorderLocatorEntrySchema = z.strictObject({
  edgeKey: z.string().min(1).describe('Canonical merged edge key.'),
  pathId: z.string().min(1).optional().describe('Optional emitted Core Path id.'),
});
