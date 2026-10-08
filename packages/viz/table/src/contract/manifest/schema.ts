import { CssColorSchema, OpacitySchema, PaintValueSchema, ThemeMode } from '@retikz/core';
import {
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import type { infer as ZodInfer, RefinementCtx, ZodArray, ZodEnum, ZodOptional } from 'zod';
import { array, discriminatedUnion, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { TableCellLocationSchema, TableCellRoleSchema } from '../../schemas';
import { TableCellAppearanceSchema, TableDefaultsSchema, TableVisualChannel } from '../../schemas';
import { TableLegendDescriptorSchema } from '../encoding';
import { TableCellAppearanceTracePathSchema, TableCellPlanSourceSchema } from '../plan';
import { TableCellSourceSchema } from '../structure';
import { TableBorderContributionOrigin } from './constants';

const TableBorderSideSchema = zodEnum(['top', 'right', 'bottom', 'left']);

const TableBorderOrientationSchema = zodEnum(['horizontal', 'vertical']);

const TableBorderPrioritySchema = number().refine(Number.isInteger, {
  message: 'Border priority must be a finite integer.',
});

const TableDefaultsProvenanceSchema = strictObject({
  path: NonBlankStringSchema.describe('Stable Table Source defaults path.'),
}).describe('Source defaults provenance attached to a resolved border contribution.');

const TableBorderVertexSchema = strictObject({
  x: number().describe('Finite Table-local x coordinate.'),
  y: number().describe('Finite Table-local y coordinate.'),
});

/** 校验最终边框线样式，包括颜色、非负线宽、虚线与固定线帽连接方式 */
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

/** 校验边框贡献来自单元格、外边框或内部网格的来源描述 */
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

/** 校验显式隐藏某段边框的候选贡献 */
export const TableNoBorderContributionSchema = strictObject({
  kind: literal('none').describe('Discriminator for an explicit hidden border candidate.'),
  origin: literal(TableBorderContributionOrigin.Explicit).describe('Explicit Table, Cell, or rule border origin.'),
  ...TableBorderContributionBaseShape,
});

const TableDefaultsNoBorderContributionSchema = strictObject({
  kind: literal('none').describe('Discriminator for a resolved hidden default border candidate.'),
  origin: literal(TableBorderContributionOrigin.Defaults).describe('Table Source defaults border origin.'),
  ...TableBorderContributionBaseShape,
  priority: literal(-100).describe('Closed Source defaults border priority.'),
  defaults: TableDefaultsProvenanceSchema.describe('Required Source defaults provenance.'),
});

const TableExplicitLineBorderContributionSchema = strictObject({
  kind: literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  origin: literal(TableBorderContributionOrigin.Explicit).describe('Explicit Table, Cell, or rule border origin.'),
  ...TableBorderContributionBaseShape,
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
});

const TableDefaultsLineBorderContributionSchema = strictObject({
  kind: literal('line').describe('Discriminator for a resolved visible-capable line candidate.'),
  origin: literal(TableBorderContributionOrigin.Defaults).describe('Resolved Table Source defaults border origin.'),
  ...TableBorderContributionBaseShape,
  priority: literal(-100).describe('Closed Source defaults border priority.'),
  line: ResolvedTableBorderLineSchema.describe('Complete resolved Core-compatible line style.'),
  defaults: TableDefaultsProvenanceSchema.describe('Required Source defaults provenance.'),
});

/** 校验来自显式声明或输入默认层的已解析线边框贡献 */
export const TableLineBorderContributionSchema = discriminatedUnion('origin', [
  TableExplicitLineBorderContributionSchema,
  TableDefaultsLineBorderContributionSchema,
]).describe('Explicit or Source-defaults-origin resolved line contribution.');

/** 校验边框竞争中的隐藏或线条候选贡献 */
export const TableBorderContributionSchema = union([
  TableNoBorderContributionSchema,
  TableDefaultsNoBorderContributionSchema,
  TableLineBorderContributionSchema,
]);

/** 校验原子边段的规范键、胜出项与有序贡献来源 */
export const TableBorderManifestAtomSchema = strictObject({
  key: NonBlankStringSchema.describe('Canonical atomic border key.'),
  winner: TableBorderContributionSchema.describe('Resolved atom winner.'),
  contributors: array(TableBorderContributionSchema).min(1).describe('Canonical ordered atom contributors.'),
});

/** 校验合并边段的局部几何、最终线样式及原子边段溯源 */
export const TableBorderManifestEntrySchema = strictObject({
  edgeKey: NonBlankStringSchema.describe('Canonical merged edge key.'),
  orientation: TableBorderOrientationSchema.describe('Edge orientation.'),
  start: TableBorderVertexSchema.describe('Table-local edge start.'),
  end: TableBorderVertexSchema.describe('Table-local edge end.'),
  style: ResolvedTableBorderLineSchema.describe('Resolved emitted line style.'),
  atoms: array(TableBorderManifestAtomSchema).min(1).describe('Canonical atomic provenance in edge order.'),
  pathId: NonBlankStringSchema.optional().describe('Optional emitted Core Path id.'),
});

/** 校验输出边框路径关联的表格标识、合并边键与原子边键 */
export const TableBorderPathMetaSchema = strictObject({
  kind: literal('tableBorder').describe('Discriminator for emitted Table border Path metadata.'),
  tableId: NonBlankStringSchema.optional().describe('Optional owning Table id.'),
  edgeKey: NonBlankStringSchema.describe('Canonical merged edge key.'),
  atomicKeys: array(NonBlankStringSchema).min(1).describe('Canonical atomic keys represented by the Path.'),
});

/** 校验合并边键与输出路径标识之间的定位记录 */
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

/** 校验已解析行列轨道的标识、下标、局部偏移和尺寸 */
export const TableTrackManifestEntrySchema = strictObject({
  id: NonBlankStringSchema.optional().describe('Optional stable semantic track id.'),
  index: NonNegativeIntegerSchema.describe('Canonical track index.'),
  offset: number().describe('Finite Table-local axis offset.'),
  size: NonNegativeNumberSchema.describe('Finite nonnegative track size.'),
}).describe('Resolved Table row or column track geometry.');

/** 校验已完成布局的单元格几何、身份、样式与溯源记录 */
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

const TableDefaultsLayerKindSchema = zodEnum(['neutral', 'style', 'source']).describe(
  'Kind of Table Source defaults layer.',
);

/** 校验按有效级联顺序保留的单层表格默认值来源 */
export const TableDefaultsSourceRecordSchema: ReturnType<
  typeof strictObject<{
    kind: typeof TableDefaultsLayerKindSchema;
    path: typeof NonBlankStringSchema;
    defaults: ZodOptional<typeof TableDefaultsSchema>;
  }>
> = strictObject({
  kind: TableDefaultsLayerKindSchema.describe('Resolved Table defaults source kind.'),
  path: NonBlankStringSchema.describe('Stable resolved Table defaults source path.'),
  defaults: TableDefaultsSchema.optional().describe('Sparse defaults contributed by this source.'),
}).describe('One Table defaults source preserved in effective cascade order.');

/** 显式引用已有 schema，避免声明生成时展开深层 defaults 而丢失类型 */
export const TableManifestStyleSchema: ReturnType<
  typeof strictObject<{
    style: ZodOptional<typeof NonBlankStringSchema>;
    themeMode: ZodEnum<typeof ThemeMode>;
    defaults: typeof TableDefaultsSchema;
    layers: ZodArray<typeof TableDefaultsSourceRecordSchema>;
  }>
> = strictObject({
  style: NonBlankStringSchema.optional().describe(
    'Optional Core Theme style selecting a host-injected Table definition.',
  ),
  themeMode: zodEnum(ThemeMode).describe('Effective Core Theme mode selecting the Table style baseline.'),
  defaults: TableDefaultsSchema.describe('Complete resolved Table Source defaults.'),
  layers: array(TableDefaultsSourceRecordSchema)
    .min(1)
    .describe('Table defaults sources in their actual cascade order.'),
})
  .superRefine((style, context) => {
    const neutral = style.layers[0];
    if (neutral.kind !== 'neutral' || neutral.path !== `$default/${style.themeMode}`) {
      context.addIssue({
        code: 'custom',
        path: ['layers', 0],
        message: 'Table defaults cascade must begin with the effective neutral source',
      });
    }

    const seen = new Set<string>();
    style.layers.forEach((layer, index) => {
      if (seen.has(layer.path)) {
        context.addIssue({
          code: 'custom',
          path: ['layers', index, 'path'],
          message: 'Table defaults source paths must be unique',
        });
      }

      seen.add(layer.path);
      if (layer.kind === 'style') {
        const expected = style.style === undefined ? undefined : `$style/${style.style}/${style.themeMode}`;
        if (expected === undefined || layer.path !== expected) {
          context.addIssue({
            code: 'custom',
            path: ['layers', index, 'path'],
            message: 'Table style defaults source path must identify the selected Core style',
          });
        }
      }

      if (layer.kind === 'source' && !layer.path.startsWith('$spec/')) {
        context.addIssue({
          code: 'custom',
          path: ['layers', index, 'path'],
          message: 'Table Source defaults path must start with $spec/',
        });
      }
    });
  })
  .describe('Resolved Table defaults metadata.');

type ManifestContribution = ZodInfer<typeof TableBorderContributionSchema>;

type ManifestStyle = ZodInfer<typeof TableManifestStyleSchema>;

const hasOwnPath = (value: unknown, path: ReadonlyArray<string>): boolean => {
  let current: unknown = value;

  for (const segment of path) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) return false;
    current = Reflect.get(current, segment);
  }

  return current !== undefined;
};

/** 将 Cell appearance pointer 映射回正式 defaults Source 中的叶路径 */
const defaultsPathOfAppearanceTrace = (
  cell: ZodInfer<typeof TableCellManifestEntrySchema>,
  tracePath: string,
): Array<string> => {
  const location = cell.location === 'columnHeader' ? 'columnHeader' : 'body';
  return ['appearanceDefaults', location, ...tracePath.split('/').filter(Boolean)];
};

/** 校验 Cell defaults trace 指向实际贡献最终叶的来源层 */
const validateAppearanceDefaultsProvenance = (
  cell: ZodInfer<typeof TableCellManifestEntrySchema>,
  trace: ZodInfer<typeof TableCellManifestEntrySchema>['appearanceTrace'][number],
  style: ManifestStyle,
  context: RefinementCtx,
  path: ReadonlyArray<string | number>,
): void => {
  if (trace.source.kind !== 'defaults') return;

  const defaultsPath = defaultsPathOfAppearanceTrace(cell, trace.path);
  const winner = [...style.layers]
    .reverse()
    .find(layer => layer.defaults !== undefined && hasOwnPath(layer.defaults, defaultsPath));
  if (winner?.path === trace.source.path) return;

  context.addIssue({
    code: 'custom',
    path: [...path, 'source', 'path'],
    message: 'Cell defaults source must match the effective defaults layer for its appearance leaf',
  });
};

/** 校验 Source defaults provenance 与有效 defaults layer 严格对应 */
const validateBorderDefaultsProvenance = (
  contribution: ManifestContribution,
  cells: ReadonlyArray<ZodInfer<typeof TableCellManifestEntrySchema>>,
  style: ManifestStyle,
  context: RefinementCtx,
  path: ReadonlyArray<string | number>,
): void => {
  if (contribution.origin !== TableBorderContributionOrigin.Defaults) return;
  if (!('defaults' in contribution)) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'defaults', 'path'],
      message: 'Border defaults source must match an effective Table defaults layer',
    });
    return;
  }

  const source = contribution.source;
  const defaultsPath = (() => {
    if (source.kind === 'cell') {
      const cell = cells.find(
        candidate => candidate.rowIndex === source.row && candidate.columnIndex === source.column,
      );
      const location = cell?.location === 'columnHeader' ? 'columnHeader' : 'body';

      return ['appearanceDefaults', location, 'borders', source.side];
    }

    if (source.scope === 'outer') {
      return ['layout', 'borders', 'outer', source.side];
    }

    return ['layout', 'borders', source.scope];
  })();
  const winner = [...style.layers]
    .reverse()
    .find(layer => layer.defaults !== undefined && hasOwnPath(layer.defaults, defaultsPath));
  if (winner?.path === contribution.defaults.path) return;

  context.addIssue({
    code: 'custom',
    path: [...path, 'defaults', 'path'],
    message: 'Border defaults source must match the effective defaults layer for its border leaf',
  });
};

/** 复用各 manifest 字段的 schema 类型，保留发布声明中的精确 JSON 契约 */
export const TableLayoutManifestSchema: ReturnType<
  typeof strictObject<{
    tableId: ZodOptional<typeof NonBlankStringSchema>;
    allocationBounds: typeof TableManifestBoundsSchema;
    visualOverflowBounds: typeof TableManifestBoundsSchema;
    rows: ZodArray<typeof TableTrackManifestEntrySchema>;
    columns: ZodArray<typeof TableTrackManifestEntrySchema>;
    cells: ZodArray<typeof TableCellManifestEntrySchema>;
    borders: ZodArray<typeof TableBorderManifestEntrySchema>;
    style: typeof TableManifestStyleSchema;
    encodings: ZodArray<
      ReturnType<
        typeof strictObject<{
          id: typeof NonBlankStringSchema;
          channel: ZodEnum<typeof TableVisualChannel>;
          scaleName: typeof NonBlankStringSchema;
          cellIndices: ZodArray<typeof NonNegativeIntegerSchema>;
        }>
      >
    >;
    legendDescriptors: ZodArray<typeof TableLegendDescriptorSchema>;
  }>
> = strictObject({
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
      cell.appearanceTrace.forEach((trace, traceIndex) => {
        validateAppearanceDefaultsProvenance(cell, trace, manifest.style, context, [
          'cells',
          cellIndex,
          'appearanceTrace',
          traceIndex,
        ]);
      });
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

        validateBorderDefaultsProvenance(atom.winner, manifest.cells, manifest.style, context, [
          'borders',
          borderIndex,
          'atoms',
          atomIndex,
          'winner',
        ]);
        atom.contributors.forEach((contribution, contributionIndex) => {
          validateBorderDefaultsProvenance(contribution, manifest.cells, manifest.style, context, [
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
