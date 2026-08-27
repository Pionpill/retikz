import type { infer as ZodInfer, RefinementCtx } from 'zod';

import { CssColorSchema, OpacitySchema, PaintValueSchema, ThemeMode, ThemeTokenSource } from '@retikz/core';
import {
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { array, discriminatedUnion, enum as zodEnum, literal, number, strictObject, union } from 'zod';

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

const TableBorderSideSchema = zodEnum(['top', 'right', 'bottom', 'left']);
const TableBorderOrientationSchema = zodEnum(['horizontal', 'vertical']);
const TableBorderPrioritySchema = number().refine(Number.isInteger, {
  message: 'Border priority must be a finite integer.',
});

export const TableBorderStyleTokenKeySchema = zodEnum([
  'table.border.top',
  'table.border.right',
  'table.border.bottom',
  'table.border.left',
  'table.border.horizontal',
  'table.border.vertical',
  'columnHeader.border.bottom',
]).describe('Closed border-producing Table style token key.');

const TableBorderStyleTokenProvenanceSchema = strictObject({
  key: TableBorderStyleTokenKeySchema.describe('Border style token mapped to this geometric source.'),
  source: zodEnum(ThemeTokenSource).describe('Border token source relation to the Table owner.'),
  path: NonBlankStringSchema.describe('Stable effective Theme or IRTable source path.'),
});

const TableBorderVertexSchema = strictObject({
  x: number().describe('Finite Table-local x coordinate.'),
  y: number().describe('Finite Table-local y coordinate.'),
});

export const ResolvedTableBorderLineSchema = strictObject({
  color: CssColorSchema.describe('Master color used to resolve contextual border paint.'),
  stroke: PaintValueSchema.refine(value => value !== 'none', {
    message: 'Resolved border stroke must not be none.',
  }).describe('Resolved non-none Core paint for the border line.'),
  width: NonNegativeNumberSchema.describe('Resolved nonnegative border width.'),
  strokeOpacity: OpacitySchema.describe('Resolved border stroke opacity.'),
  dashPattern: array(PositiveNumberSchema)
    .min(1)
    .optional()
    .describe('Optional non-empty positive dash pattern; omission means solid.'),
  dashOffset: number().describe('Resolved finite border dash offset.'),
  lineCap: literal('butt').describe('Canonical border line cap.'),
  lineJoin: literal('miter').describe('Canonical border line join.'),
});

const TableCellBorderSourceSchema = strictObject({
  kind: literal('cell').describe('Discriminator for a Cell-side border source.'),
  cellId: NonBlankStringSchema.optional().describe('Optional semantic Cell id retained for provenance.'),
  row: NonNegativeIntegerSchema.describe('Canonical origin row index.'),
  column: NonNegativeIntegerSchema.describe('Canonical origin column index.'),
  side: TableBorderSideSchema.describe('Physical Cell side that supplied the candidate.'),
});

const TableOuterBorderSourceSchema = strictObject({
  kind: literal('default').describe('Discriminator for a Table default border source.'),
  scope: literal('outer').describe('Outer-frame default scope.'),
  side: TableBorderSideSchema.describe('Table outer side that supplied the candidate.'),
});

const TableGridBorderSourceSchema = strictObject({
  kind: literal('default').describe('Discriminator for a Table default border source.'),
  scope: zodEnum(['horizontal', 'vertical']).describe('Internal grid default scope.'),
  boundaryIndex: NonNegativeIntegerSchema.describe('Canonical internal boundary index.'),
});

export const TableBorderSourceSchema = union([
  TableCellBorderSourceSchema,
  TableOuterBorderSourceSchema,
  TableGridBorderSourceSchema,
]);

const TableBorderContributionBaseShape = {
  key: NonBlankStringSchema.describe('Transaction-unique contribution key.'),
  source: TableBorderSourceSchema.describe('Canonical border candidate source.'),
  priority: TableBorderPrioritySchema.describe('Resolved finite conflict priority.'),
  specificity: union([literal(0), literal(1)]).describe('Default or Cell-side specificity rank.'),
  ownerSideRank: number().int().describe('Canonical physical owner-side rank.'),
  sourceOrderKey: NonBlankStringSchema.describe('Canonical source ordering key independent of Cell id.'),
};

export const TableNoBorderContributionSchema = strictObject({
  kind: literal('none').describe('Discriminator for an explicit hidden border candidate.'),
  origin: literal(TableBorderContributionOrigin.Explicit).describe('Explicit Table, Cell, or rule border origin.'),
  ...TableBorderContributionBaseShape,
});

const TableExplicitLineBorderContributionSchema = strictObject({
  kind: literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  origin: literal(TableBorderContributionOrigin.Explicit).describe('Explicit Table, Cell, or rule border origin.'),
  ...TableBorderContributionBaseShape,
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
});

const TableStyleTokenLineBorderContributionSchema = strictObject({
  kind: literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  origin: literal(TableBorderContributionOrigin.StyleToken).describe('Resolved Table style token border origin.'),
  ...TableBorderContributionBaseShape,
  priority: literal(-100).describe('Closed style token border priority.'),
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
  styleToken: TableBorderStyleTokenProvenanceSchema.describe('Required style token provenance.'),
});

export const TableLineBorderContributionSchema = discriminatedUnion('origin', [
  TableExplicitLineBorderContributionSchema,
  TableStyleTokenLineBorderContributionSchema,
]).describe('Explicit or style-token-origin resolved line contribution.');

export const TableBorderContributionSchema = union([
  TableNoBorderContributionSchema,
  TableLineBorderContributionSchema,
]);

export const TableBorderManifestAtomSchema = strictObject({
  key: NonBlankStringSchema.describe('Canonical atomic border key.'),
  winner: TableBorderContributionSchema.describe('Resolved atom winner.'),
  contributors: array(TableBorderContributionSchema).min(1).describe('Canonical ordered atom contributors.'),
});

export const TableBorderManifestEntrySchema = strictObject({
  edgeKey: NonBlankStringSchema.describe('Canonical merged edge key.'),
  orientation: TableBorderOrientationSchema.describe('Edge orientation.'),
  start: TableBorderVertexSchema.describe('Table-local edge start.'),
  end: TableBorderVertexSchema.describe('Table-local edge end.'),
  style: ResolvedTableBorderLineSchema.describe('Resolved emitted line style.'),
  atoms: array(TableBorderManifestAtomSchema).min(1).describe('Canonical atomic provenance in edge order.'),
  pathId: NonBlankStringSchema.optional().describe('Optional emitted Core Path id.'),
});

export const TableBorderPathMetaSchema = strictObject({
  kind: literal('tableBorder').describe('Discriminator for emitted Table border Path metadata.'),
  tableId: NonBlankStringSchema.optional().describe('Optional owning Table id.'),
  edgeKey: NonBlankStringSchema.describe('Canonical merged edge key.'),
  atomicKeys: array(NonBlankStringSchema).min(1).describe('Canonical atomic keys represented by the Path.'),
});

export const TableBorderLocatorEntrySchema = strictObject({
  edgeKey: NonBlankStringSchema.describe('Canonical merged edge key.'),
  pathId: NonBlankStringSchema.optional().describe('Optional emitted Core Path id.'),
});

const TableManifestBoundsSchema = strictObject({
  x: number().describe('Finite Table-local left coordinate.'),
  y: number().describe('Finite Table-local top coordinate.'),
  width: NonNegativeNumberSchema.describe('Finite nonnegative bounds width.'),
  height: NonNegativeNumberSchema.describe('Finite nonnegative bounds height.'),
}).describe('Detached Table-local axis-aligned bounds.');

export const TableTrackManifestEntrySchema = strictObject({
  id: NonBlankStringSchema.optional().describe('Optional stable semantic track id.'),
  index: NonNegativeIntegerSchema.describe('Canonical track index.'),
  offset: number().describe('Finite Table-local axis offset.'),
  size: NonNegativeNumberSchema.describe('Finite nonnegative track size.'),
}).describe('Resolved Table row or column track geometry.');

export const TableCellManifestEntrySchema = strictObject({
  cellId: NonBlankStringSchema.optional().describe('Optional stable semantic Cell id.'),
  rowId: NonBlankStringSchema.optional().describe('Optional stable semantic row id.'),
  columnId: NonBlankStringSchema.optional().describe('Optional stable semantic column id.'),
  rowIndex: NonNegativeIntegerSchema.describe('Canonical origin row index.'),
  columnIndex: NonNegativeIntegerSchema.describe('Canonical origin column index.'),
  span: strictObject({
    rows: PositiveIntegerSchema.describe('Resolved positive row span.'),
    columns: PositiveIntegerSchema.describe('Resolved positive column span.'),
  }).describe('Resolved rectangular Cell span.'),
  box: TableManifestBoundsSchema.describe('Table-local Cell box.'),
  contentBox: TableManifestBoundsSchema.describe('Table-local padding-reduced content box.'),
  sourceAllocationBounds: TableManifestBoundsSchema.describe('Replay-root local source allocation bounds.'),
  sourceVisualOverflowBounds: TableManifestBoundsSchema.describe('Replay-root local source visual bounds.'),
  contentAllocationBounds: TableManifestBoundsSchema.describe('Table-local fit and alignment allocation bounds.'),
  visualOverflowBounds: TableManifestBoundsSchema.describe('Table-local visible bounds after overflow policy.'),
  location: TableCellLocationSchema.describe('Semantic Cell location.'),
  roles: array(TableCellRoleSchema).min(1).describe('Semantic Cell roles.'),
  source: TableCellSourceSchema.optional().describe('Optional stable Cell source identity.'),
  formatterName: NonBlankStringSchema.optional().describe('Executed formatter name for value Cells.'),
  presentationName: NonBlankStringSchema.optional().describe('Executed presentation name for value Cells.'),
  matchedRuleIndices: array(NonNegativeIntegerSchema).describe('Ordered matched root rule indices.'),
  encodingIds: array(NonBlankStringSchema).describe('Ordered visual encodings that produced a Cell color.'),
  appearance: TableCellAppearanceSchema.describe('Resolved Cell appearance consumed by layout.'),
  appearanceTrace: array(
    strictObject({
      path: TableCellAppearanceTracePathSchema.describe('Canonical appearance leaf path.'),
      source: TableCellPlanSourceSchema.describe('Winning source for the resolved appearance leaf.'),
    }),
  ).describe('Canonical path-sorted appearance winner lineage.'),
}).describe('Resolved Table Cell geometry, identity, and provenance.');

const TableThemeTokenSourceRecordSchema = strictObject({
  key: TableThemeTokenKeySchema.describe('Canonical Table theme token key.'),
  source: zodEnum(ThemeTokenSource).describe('Resolved token source relation to the Table owner.'),
  path: NonBlankStringSchema.describe('Stable effective Theme or IRTable source path.'),
});

const TableManifestStyleSchema = strictObject({
  style: NonBlankStringSchema.optional().describe(
    'Optional Core Theme style selecting a host-injected Table definition.',
  ),
  themeMode: zodEnum(ThemeMode).describe('Effective Core Theme mode selecting the Table style baseline.'),
  tokens: TableThemeTokenMapSchema.describe('Complete resolved Table theme token map.'),
  sources: array(TableThemeTokenSourceRecordSchema).length(19).describe('Token winners in canonical schema key order.'),
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
      const localPaths = [
        `$default/${style.themeMode}/${key}`,
        ...(style.style === undefined ? [] : [`$style/${style.style}/${style.themeMode}/${key}`]),
        `$spec/tableThemeTokens/${key}`,
      ];
      const valid =
        key === 'data.categorical'
          ? (source.source === ThemeTokenSource.Inherit && source.path === '$theme/colors/categorical') ||
            (source.source === ThemeTokenSource.Local && source.path === `$spec/tableThemeTokens/${key}`)
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

type ManifestLineContribution = ZodInfer<typeof TableLineBorderContributionSchema>;
type ManifestCell = ZodInfer<typeof TableCellManifestEntrySchema>;
type ManifestStyle = ZodInfer<typeof TableManifestStyleSchema>;

/** 比较 resolved line 是否精确来自同一 style border token */
const matchesStyleBorderToken = (
  line: ZodInfer<typeof ResolvedTableBorderLineSchema>,
  token: NonNullable<ManifestStyle['tokens'][ZodInfer<typeof TableBorderStyleTokenKeySchema>]>,
  masterColor: string,
): boolean =>
  line.color === masterColor &&
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
  context: RefinementCtx,
  path: ReadonlyArray<string | number>,
): void => {
  if (contribution.origin !== TableBorderContributionOrigin.StyleToken) return;
  const token = contribution.styleToken;

  let expectedKey: ZodInfer<typeof TableBorderStyleTokenKeySchema> | undefined;
  if (contribution.source.kind === 'default') {
    expectedKey =
      contribution.source.scope === 'outer'
        ? `table.border.${contribution.source.side}`
        : `table.border.${contribution.source.scope}`;
  } else {
    const source = contribution.source;
    const cell = cells.find(candidate => candidate.rowIndex === source.row && candidate.columnIndex === source.column);
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
  const contributionSource = contribution.source;
  const sourceCell =
    contributionSource.kind === 'cell'
      ? cells.find(
          candidate =>
            candidate.rowIndex === contributionSource.row && candidate.columnIndex === contributionSource.column,
        )
      : undefined;
  const masterColor =
    sourceCell?.appearance.content?.color ??
    (sourceCell?.location === 'columnHeader'
      ? style.tokens['columnHeader.content.color']
      : style.tokens['cell.content.color']) ??
    'currentColor';
  if (styleBorder === null || !matchesStyleBorderToken(contribution.line, styleBorder, masterColor)) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'line'],
      message: 'Border style token line must match the resolved style token value',
    });
  }
};

export const TableLayoutManifestSchema = strictObject({
  tableId: NonBlankStringSchema.optional().describe('Optional public Table id.'),
  allocationBounds: TableManifestBoundsSchema.describe('Tracks and gaps allocation bounds.'),
  visualOverflowBounds: TableManifestBoundsSchema.describe('Visible Cell and border union in Table-local space.'),
  rows: array(TableTrackManifestEntrySchema).describe('Canonical row track geometry.'),
  columns: array(TableTrackManifestEntrySchema).describe('Canonical column track geometry.'),
  cells: array(TableCellManifestEntrySchema).describe('Canonical Cell geometry and provenance.'),
  borders: array(TableBorderManifestEntrySchema).describe('Visible border edge geometry and provenance.'),
  style: TableManifestStyleSchema,
  encodings: array(
    strictObject({
      id: NonBlankStringSchema.describe('Visual encoding id.'),
      channel: zodEnum(TableVisualChannel).describe('Encoding-owned Cell appearance channel.'),
      scaleName: NonBlankStringSchema.describe('Resolved visual scale definition name.'),
      cellIndices: array(NonNegativeIntegerSchema).describe('Canonical Cell indices that received an encoding color.'),
    }),
  ).describe('Ordered visual encoding manifest seed.'),
  legendDescriptors: array(TableLegendDescriptorSchema).describe(
    'Ordered Table-domain Legend descriptors from the same visual scale resolutions.',
  ),
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
      const expectedCellIndices = manifest.cells.flatMap((cell, cellIndex) =>
        cell.encodingIds.includes(encoding.id) ? [cellIndex] : [],
      );
      if (
        encoding.cellIndices.length !== expectedCellIndices.length ||
        encoding.cellIndices.some((cellIndex, index) => cellIndex !== expectedCellIndices[index])
      ) {
        context.addIssue({
          code: 'custom',
          path: ['encodings', encodingIndex, 'cellIndices'],
          message: 'Manifest encoding Cell indices must match canonical Cell encoding lineage',
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
