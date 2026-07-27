import { OpacitySchema, PaintValueSchema } from '@retikz/core';
import { z } from 'zod';

import { TableCellLocationSchema, TableCellRoleSchema } from '../../schemas';
import { TableCellSourceSchema } from '../structure';

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
  edgeKey: z.string().min(1).describe('Canonical merged edge key.'),
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

const TableManifestBoundsSchema = z
  .strictObject({
    x: z.number().describe('Finite Table-local left coordinate.'),
    y: z.number().describe('Finite Table-local top coordinate.'),
    width: z.number().nonnegative().describe('Finite nonnegative bounds width.'),
    height: z.number().nonnegative().describe('Finite nonnegative bounds height.'),
  })
  .describe('Detached Table-local axis-aligned bounds.');

export const TableTrackManifestEntrySchema = z
  .strictObject({
    id: z.string().min(1).describe('Stable semantic track id.'),
    index: z.number().int().nonnegative().describe('Canonical track index.'),
    offset: z.number().describe('Finite Table-local axis offset.'),
    size: z.number().nonnegative().describe('Finite nonnegative track size.'),
  })
  .describe('Resolved Table row or column track geometry.');

export const TableCellManifestEntrySchema = z
  .strictObject({
    cellId: z.string().min(1).describe('Stable semantic Cell id.'),
    rowId: z.string().min(1).describe('Stable semantic row id.'),
    columnId: z.string().min(1).describe('Stable semantic column id.'),
    rowIndex: z.number().int().nonnegative().describe('Canonical origin row index.'),
    columnIndex: z.number().int().nonnegative().describe('Canonical origin column index.'),
    span: z
      .strictObject({
        rows: z.number().int().positive().describe('Resolved positive row span.'),
        columns: z.number().int().positive().describe('Resolved positive column span.'),
      })
      .describe('Resolved rectangular Cell span.'),
    box: TableManifestBoundsSchema.describe('Table-local Cell box.'),
    contentBox: TableManifestBoundsSchema.describe('Table-local padding-reduced content box.'),
    sourceAllocationBounds: TableManifestBoundsSchema.describe('Replay-root local source allocation bounds.'),
    sourceVisualOverflowBounds: TableManifestBoundsSchema.describe('Replay-root local source visual bounds.'),
    contentAllocationBounds: TableManifestBoundsSchema.describe('Table-local fit and alignment allocation bounds.'),
    visualOverflowBounds: TableManifestBoundsSchema.describe('Table-local visible bounds after overflow policy.'),
    location: TableCellLocationSchema.describe('Semantic Cell location.'),
    roles: z.array(TableCellRoleSchema).min(1).describe('Semantic Cell roles.'),
    source: TableCellSourceSchema.optional().describe('Optional stable Cell source identity.'),
  })
  .describe('Resolved Table Cell geometry, identity, and provenance.');

export const TableLayoutManifestSchema = z
  .strictObject({
    tableId: z.string().min(1).optional().describe('Optional public Table id.'),
    allocationBounds: TableManifestBoundsSchema.describe('Tracks and gaps allocation bounds.'),
    visualOverflowBounds: TableManifestBoundsSchema.describe('Visible Cell and border union in Table-local space.'),
    rows: z.array(TableTrackManifestEntrySchema).describe('Canonical row track geometry.'),
    columns: z.array(TableTrackManifestEntrySchema).describe('Canonical column track geometry.'),
    cells: z.array(TableCellManifestEntrySchema).describe('Canonical Cell geometry and provenance.'),
    borders: z.array(TableBorderManifestEntrySchema).describe('Visible border edge geometry and provenance.'),
  })
  .describe('Detached immutable Table layout manifest emitted as a composite artifact.');
