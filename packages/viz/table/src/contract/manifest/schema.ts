import { OpacitySchema, PaintValueSchema, ThemeMode, ThemeTokenSource } from '@retikz/core';
import {
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { z } from 'zod';

import { TableCellLocationSchema, TableCellRoleSchema } from '../../schemas';
import {
  TableCellAppearanceSchema,
  TableThemeTokenKeySchema,
  TableThemeTokenMapSchema,
  TableVisualChannel,
} from '../../schemas';
import { TableLegendDescriptorSchema } from '../encoding';
import { TableCellAppearanceTracePathSchema, TableCellPlanSourceSchema } from '../plan';
import { TableCellSourceSchema } from '../structure';
import { TableBorderContributionOrigin } from './constants';

const TableBorderSideSchema = z.enum(['top', 'right', 'bottom', 'left']);
const TableBorderOrientationSchema = z.enum(['horizontal', 'vertical']);
const TableBorderPrioritySchema = z
  .number()
  .refine(Number.isInteger, { message: 'Border priority must be a finite integer.' });

export const TableBorderStyleTokenKeySchema = z
  .enum([
    'table.border.top',
    'table.border.right',
    'table.border.bottom',
    'table.border.left',
    'table.border.horizontal',
    'table.border.vertical',
    'columnHeader.border.bottom',
  ])
  .describe('Closed border-producing Table style token key.');

const TableBorderStyleTokenProvenanceSchema = z.strictObject({
  key: TableBorderStyleTokenKeySchema.describe('Border style token mapped to this geometric source.'),
  source: z.enum(ThemeTokenSource).describe('Border token source relation to the Table owner.'),
  path: z.string().min(1).describe('Stable effective Theme or IRTable source path.'),
});

const TableBorderVertexSchema = z.strictObject({
  x: z.number().describe('Finite Table-local x coordinate.'),
  y: z.number().describe('Finite Table-local y coordinate.'),
});

export const ResolvedTableBorderLineSchema = z.strictObject({
  stroke: PaintValueSchema.refine(value => value !== 'none', {
    message: 'Resolved border stroke must not be none.',
  }).describe('Resolved non-none Core paint for the border line.'),
  width: NonNegativeNumberSchema.describe('Resolved nonnegative border width.'),
  strokeOpacity: OpacitySchema.describe('Resolved border stroke opacity.'),
  dashPattern: z
    .array(PositiveNumberSchema)
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
  row: NonNegativeIntegerSchema.describe('Canonical origin row index.'),
  column: NonNegativeIntegerSchema.describe('Canonical origin column index.'),
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
  boundaryIndex: NonNegativeIntegerSchema.describe('Canonical internal boundary index.'),
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
  origin: z.literal(TableBorderContributionOrigin.Explicit).describe('Explicit Table, Cell, or rule border origin.'),
  ...TableBorderContributionBaseShape,
});

const TableExplicitLineBorderContributionSchema = z.strictObject({
  kind: z.literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  origin: z.literal(TableBorderContributionOrigin.Explicit).describe('Explicit Table, Cell, or rule border origin.'),
  ...TableBorderContributionBaseShape,
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
});

const TableStyleTokenLineBorderContributionSchema = z.strictObject({
  kind: z.literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  origin: z.literal(TableBorderContributionOrigin.StyleToken).describe('Resolved Table style token border origin.'),
  ...TableBorderContributionBaseShape,
  priority: z.literal(-100).describe('Closed style token border priority.'),
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
  styleToken: TableBorderStyleTokenProvenanceSchema.describe('Required style token provenance.'),
});

export const TableLineBorderContributionSchema = z
  .discriminatedUnion('origin', [
    TableExplicitLineBorderContributionSchema,
    TableStyleTokenLineBorderContributionSchema,
  ])
  .describe('Explicit or style-token-origin resolved line contribution.');

export const TableBorderContributionSchema = z.union([
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
    width: NonNegativeNumberSchema.describe('Finite nonnegative bounds width.'),
    height: NonNegativeNumberSchema.describe('Finite nonnegative bounds height.'),
  })
  .describe('Detached Table-local axis-aligned bounds.');

export const TableTrackManifestEntrySchema = z
  .strictObject({
    id: z.string().min(1).describe('Stable semantic track id.'),
    index: NonNegativeIntegerSchema.describe('Canonical track index.'),
    offset: z.number().describe('Finite Table-local axis offset.'),
    size: NonNegativeNumberSchema.describe('Finite nonnegative track size.'),
  })
  .describe('Resolved Table row or column track geometry.');

export const TableCellManifestEntrySchema = z
  .strictObject({
    cellId: z.string().min(1).describe('Stable semantic Cell id.'),
    rowId: z.string().min(1).describe('Stable semantic row id.'),
    columnId: z.string().min(1).describe('Stable semantic column id.'),
    rowIndex: NonNegativeIntegerSchema.describe('Canonical origin row index.'),
    columnIndex: NonNegativeIntegerSchema.describe('Canonical origin column index.'),
    span: z
      .strictObject({
        rows: PositiveIntegerSchema.describe('Resolved positive row span.'),
        columns: PositiveIntegerSchema.describe('Resolved positive column span.'),
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
    formatterName: z.string().min(1).optional().describe('Executed formatter name for value Cells.'),
    presentationName: z.string().min(1).optional().describe('Executed presentation name for value Cells.'),
    matchedRuleIndices: z.array(NonNegativeIntegerSchema).describe('Ordered matched root rule indices.'),
    encodingIds: z.array(z.string().min(1)).describe('Ordered visual encodings that produced a Cell color.'),
    appearance: TableCellAppearanceSchema.describe('Resolved Cell appearance consumed by layout.'),
    appearanceTrace: z
      .array(
        z.strictObject({
          path: TableCellAppearanceTracePathSchema.describe('Canonical appearance leaf path.'),
          source: TableCellPlanSourceSchema.describe('Winning source for the resolved appearance leaf.'),
        }),
      )
      .describe('Canonical path-sorted appearance winner lineage.'),
  })
  .describe('Resolved Table Cell geometry, identity, and provenance.');

const TableThemeTokenSourceRecordSchema = z.strictObject({
  key: TableThemeTokenKeySchema.describe('Canonical Table theme token key.'),
  source: z.enum(ThemeTokenSource).describe('Resolved token source relation to the Table owner.'),
  path: z.string().min(1).describe('Stable effective Theme or IRTable source path.'),
});

const TableManifestStyleSchema = z
  .strictObject({
    style: z.string().min(1).optional().describe('Optional Core Theme style selecting a host-injected Table definition.'),
    themeMode: z.enum(ThemeMode).describe('Effective Core Theme mode selecting the Table style baseline.'),
    tokens: TableThemeTokenMapSchema.describe('Complete resolved Table theme token map.'),
    sources: z
      .array(TableThemeTokenSourceRecordSchema)
      .length(19)
      .describe('Token winners in canonical schema key order.'),
  })
  .superRefine((style, context) => {
    TableThemeTokenKeySchema.options.forEach((key, index) => {
      const source = style.sources[index];
      if (source.key !== key) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'key'],
          message: `Style token sources must use canonical key order; expected "${key}"`,
        });
        return;
      }
      const baselinePath =
        style.style === undefined
          ? `$default/${style.themeMode}/${key}`
          : `$style/${style.style}/${style.themeMode}/${key}`;
      const localPaths = [baselinePath, `$spec/tableThemeTokens/${key}`];
      const valid =
        key === 'data.categorical'
          ? (source.source === ThemeTokenSource.Inherit && source.path === '$theme/colors/categorical') ||
            (source.source === ThemeTokenSource.Local && source.path === localPaths[1])
          : source.source === ThemeTokenSource.Local && localPaths.includes(source.path);
      if (!valid) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'path'],
          message: `Style token source and path must identify the canonical winner for "${key}"`,
        });
      }
    });
  })
  .describe('Resolved Table style metadata.');

type ManifestLineContribution = z.infer<typeof TableLineBorderContributionSchema>;
type ManifestCell = z.infer<typeof TableCellManifestEntrySchema>;
type ManifestStyle = z.infer<typeof TableManifestStyleSchema>;

/** 比较 resolved line 是否精确来自同一 style border token */
const matchesStyleBorderToken = (
  line: z.infer<typeof ResolvedTableBorderLineSchema>,
  token: NonNullable<ManifestStyle['tokens'][z.infer<typeof TableBorderStyleTokenKeySchema>]>,
): boolean =>
  JSON.stringify(line.stroke) === JSON.stringify(token.stroke ?? 'currentColor') &&
  line.width === (token.width ?? 1) &&
  line.strokeOpacity === (token.strokeOpacity ?? 1) &&
  JSON.stringify(line.dashPattern) === JSON.stringify(token.dashPattern) &&
  line.dashOffset === (token.dashOffset ?? 0);

/** 校验 style token provenance 与 Border Graph 几何来源严格对应 */
const validateBorderStyleTokenProvenance = (
  contribution: ManifestLineContribution,
  cells: ReadonlyArray<ManifestCell>,
  style: ManifestStyle,
  context: z.RefinementCtx,
  path: ReadonlyArray<string | number>,
): void => {
  if (contribution.origin !== TableBorderContributionOrigin.StyleToken) return;
  const token = contribution.styleToken;

  let expectedKey: z.infer<typeof TableBorderStyleTokenKeySchema> | undefined;
  if (contribution.source.kind === 'default') {
    expectedKey =
      contribution.source.scope === 'outer'
        ? `table.border.${contribution.source.side}`
        : `table.border.${contribution.source.scope}`;
  } else {
    const source = contribution.source;
    const cell = cells.find(candidate => candidate.cellId === source.cellId);
    if (
      source.side === 'bottom' &&
      cell?.location === 'columnHeader' &&
      cell.rowIndex === source.row &&
      cell.columnIndex === source.column
    ) {
      expectedKey = 'columnHeader.border.bottom';
    }
  }
  if (token.key !== expectedKey) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'styleToken', 'key'],
      message: 'Border style token key must match its geometric source and Cell location',
    });
  }
  const expectedSource = style.sources.find(entry => entry.key === token.key);
  if (expectedSource === undefined || token.source !== expectedSource.source || token.path !== expectedSource.path) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'styleToken', 'source'],
      message: 'Border style token source must match the resolved style winner',
    });
  }
  const styleBorder = style.tokens[token.key];
  if (styleBorder === null || !matchesStyleBorderToken(contribution.line, styleBorder)) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'line'],
      message: 'Border style token line must match the resolved style token value',
    });
  }
};

/** 判断两个字符串序列是否逐项相等 */
const sameStringSequence = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const TableLayoutManifestSchema = z
  .strictObject({
    tableId: z.string().min(1).optional().describe('Optional public Table id.'),
    allocationBounds: TableManifestBoundsSchema.describe('Tracks and gaps allocation bounds.'),
    visualOverflowBounds: TableManifestBoundsSchema.describe('Visible Cell and border union in Table-local space.'),
    rows: z.array(TableTrackManifestEntrySchema).describe('Canonical row track geometry.'),
    columns: z.array(TableTrackManifestEntrySchema).describe('Canonical column track geometry.'),
    cells: z.array(TableCellManifestEntrySchema).describe('Canonical Cell geometry and provenance.'),
    borders: z.array(TableBorderManifestEntrySchema).describe('Visible border edge geometry and provenance.'),
    style: TableManifestStyleSchema,
    encodings: z
      .array(
        z.strictObject({
          id: z.string().min(1).describe('Visual encoding id.'),
          channel: z.enum(TableVisualChannel).describe('Encoding-owned Cell appearance channel.'),
          scaleName: z.string().min(1).describe('Resolved visual scale definition name.'),
          cellIds: z.array(z.string().min(1)).describe('Canonical Cells that received an encoding color.'),
        }),
      )
      .describe('Ordered visual encoding manifest seed.'),
    legendDescriptors: z
      .array(TableLegendDescriptorSchema)
      .describe('Ordered Table-domain Legend descriptors from the same visual scale resolutions.'),
  })
  .superRefine((manifest, context) => {
    const encodingsById = new Map<string, (typeof manifest.encodings)[number]>();
    const encodingOrder = new Map<string, number>();
    manifest.encodings.forEach((encoding, index) => {
      if (encodingsById.has(encoding.id)) {
        context.addIssue({
          code: 'custom',
          path: ['encodings', index, 'id'],
          message: 'Manifest encoding ids must be unique',
        });
        return;
      }
      encodingsById.set(encoding.id, encoding);
      encodingOrder.set(encoding.id, index);
    });
    manifest.cells.forEach((cell, cellIndex) => {
      let previousOrder = -1;
      cell.encodingIds.forEach((encodingId, encodingIndex) => {
        const order = encodingOrder.get(encodingId);
        if (order === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['cells', cellIndex, 'encodingIds', encodingIndex],
            message: 'Cell encoding id must reference a manifest encoding',
          });
          return;
        }
        if (order <= previousOrder) {
          context.addIssue({
            code: 'custom',
            path: ['cells', cellIndex, 'encodingIds', encodingIndex],
            message: 'Cell encoding ids must be unique and follow manifest encoding order',
          });
        }
        previousOrder = order;
      });
    });
    manifest.encodings.forEach((encoding, encodingIndex) => {
      const expectedCellIds = manifest.cells
        .filter(cell => cell.encodingIds.includes(encoding.id))
        .map(cell => cell.cellId);
      if (!sameStringSequence(encoding.cellIds, expectedCellIds)) {
        context.addIssue({
          code: 'custom',
          path: ['encodings', encodingIndex, 'cellIds'],
          message: 'Manifest encoding Cell ids must match canonical Cell encoding lineage',
        });
      }
    });
    const descriptorEncodingIds = new Set<string>();
    manifest.legendDescriptors.forEach((descriptor, descriptorIndex) => {
      const encoding = encodingsById.get(descriptor.encodingId);
      if (encoding === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['legendDescriptors', descriptorIndex, 'encodingId'],
          message: 'Legend descriptor encoding id must reference a manifest encoding',
        });
      } else {
        if (descriptor.channel !== encoding.channel) {
          context.addIssue({
            code: 'custom',
            path: ['legendDescriptors', descriptorIndex, 'channel'],
            message: 'Legend descriptor channel must match its manifest encoding',
          });
        }
        if (descriptor.scaleName !== encoding.scaleName) {
          context.addIssue({
            code: 'custom',
            path: ['legendDescriptors', descriptorIndex, 'scaleName'],
            message: 'Legend descriptor scale name must match its manifest encoding',
          });
        }
      }
      if (descriptorEncodingIds.has(descriptor.encodingId)) {
        context.addIssue({
          code: 'custom',
          path: ['legendDescriptors', descriptorIndex, 'encodingId'],
          message: 'Each manifest encoding may produce at most one Legend descriptor',
        });
      }
      descriptorEncodingIds.add(descriptor.encodingId);
    });
    if (manifest.legendDescriptors.length > 0 && manifest.tableId === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['tableId'],
        message: 'Table id is required when the manifest contains Legend descriptors',
      });
    }
    manifest.borders.forEach((border, borderIndex) => {
      border.atoms.forEach((atom, atomIndex) => {
        const contributionKeys = new Set(atom.contributors.map(contribution => contribution.key));
        if (contributionKeys.size !== atom.contributors.length) {
          context.addIssue({
            code: 'custom',
            path: ['borders', borderIndex, 'atoms', atomIndex, 'contributors'],
            message: 'Border atom contribution keys must be unique',
          });
        }
        const matchingWinner = atom.contributors.find(contribution => contribution.key === atom.winner.key);
        if (matchingWinner === undefined || JSON.stringify(matchingWinner) !== JSON.stringify(atom.winner)) {
          context.addIssue({
            code: 'custom',
            path: ['borders', borderIndex, 'atoms', atomIndex, 'winner'],
            message: 'Border atom winner must exactly match one contributor',
          });
        }
        if (atom.winner.kind === 'line') {
          validateBorderStyleTokenProvenance(atom.winner, manifest.cells, manifest.style, context, [
            'borders',
            borderIndex,
            'atoms',
            atomIndex,
            'winner',
          ]);
        }
        atom.contributors.forEach((contribution, contributionIndex) => {
          if (contribution.kind !== 'line') return;
          validateBorderStyleTokenProvenance(contribution, manifest.cells, manifest.style, context, [
            'borders',
            borderIndex,
            'atoms',
            atomIndex,
            'contributors',
            contributionIndex,
          ]);
        });
      });
    });
  })
  .describe('Detached immutable Table layout manifest emitted as a composite artifact.');
