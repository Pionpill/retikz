import { describe, expect, expectTypeOf, it } from 'vitest';

import type * as TableTypes from '../src';

import * as Table from '../src';
import * as StructurePublic from '../src/contract/structure/public';

type PublicContractTypes = [
  TableTypes.LowerTablesOptions,
  TableTypes.CompileTableOptions,
  TableTypes.CompileTableResult,
  TableTypes.TableCompileArtifact,
  TableTypes.TableRuntimeContributionInput,
  TableTypes.TableRuntimeContribution,
  TableTypes.TableLayoutManifest,
  TableTypes.ResolvedTableBorderLine,
  TableTypes.TableBorderContribution,
  TableTypes.TableBorderManifestEntry,
  TableTypes.TableBorderPathMeta,
  TableTypes.IRManualTableCell,
  TableTypes.IRTableCellSelector,
  TableTypes.IRTableValuePredicate,
  TableTypes.IRTableCellRule,
  TableTypes.TableCellPlanSource,
  TableTypes.TableCellAppearanceTracePathValue,
  TableTypes.IRTableCellVisualEncoding,
  TableTypes.IRTableVisualScaleRef,
  TableTypes.CellVisualScaleDefinition,
  TableTypes.AnyCellVisualScaleDefinition,
  TableTypes.TableLegendDescriptor,
  TableTypes.IRTableStyleTokens,
  TableTypes.TableStyleTokenMap,
  TableTypes.TableStyleTokenKey,
];

// @ts-expect-error 旧 addressed manual Cell 类型不再从包根导出
type RemovedIRTableCell = TableTypes.IRTableCell;
// @ts-expect-error 旧 addressed manual Cell 地址类型不再从包根导出
type RemovedIRTableCellAddress = TableTypes.IRTableCellAddress;

// @ts-expect-error 阶段级 resolved layout 不从包根导出
type RemovedResolvedTableLayoutSpec = TableTypes.ResolvedTableLayoutSpec;
// @ts-expect-error 阶段级 track layout 不从包根导出
type RemovedTableTrackLayout = TableTypes.TableTrackLayout;
// @ts-expect-error 阶段级 Cell layout 不从包根导出
type RemovedTableCellLayout = TableTypes.TableCellLayout;
// @ts-expect-error 阶段级 Table layout 不从包根导出
type RemovedTableLayout = TableTypes.TableLayout;
// @ts-expect-error 阶段级 normalize options 不从包根导出
type RemovedNormalizeTableStructureOptions = TableTypes.NormalizeTableStructureOptions;
// @ts-expect-error 阶段级 Cell fit 策略不从包根导出
type RemovedTableCellFit = TableTypes.TableCellFit;
// @ts-expect-error 阶段级 Cell fit scale 不从包根导出
type RemovedTableCellFitScale = TableTypes.TableCellFitScale;
// @ts-expect-error 阶段级 Cell overflow 策略不从包根导出
type RemovedTableCellOverflow = TableTypes.TableCellOverflow;
// @ts-expect-error 阶段级 Cell content placement 不从包根导出
type RemovedTableCellContentPlacement = TableTypes.TableCellContentPlacement;
// @ts-expect-error 私有 Border Graph input 不从包根导出
type RemovedBuildTableBorderGraphInput = TableTypes.BuildTableBorderGraphInput;
// @ts-expect-error 私有 Border Graph result 不从包根导出
type RemovedTableBorderGraph = TableTypes.TableBorderGraph;
// @ts-expect-error package-private resolved plan 不从包根导出
type RemovedResolvedTableCellPlan = TableTypes.ResolvedTableCellPlan;

type RemovedStageTypes = [
  RemovedResolvedTableLayoutSpec,
  RemovedTableTrackLayout,
  RemovedTableCellLayout,
  RemovedTableLayout,
  RemovedNormalizeTableStructureOptions,
  RemovedTableCellFit,
  RemovedTableCellFitScale,
  RemovedTableCellOverflow,
  RemovedTableCellContentPlacement,
  RemovedBuildTableBorderGraphInput,
  RemovedTableBorderGraph,
  RemovedResolvedTableCellPlan,
  RemovedIRTableCell,
  RemovedIRTableCellAddress,
];

describe('@retikz/table public API', () => {
  it('exports the alpha.2 compile, schema, and manifest surface without pipeline stages', () => {
    expect(Table).toHaveProperty('createTableRuntimeContribution');
    expect(Table).toHaveProperty('makeTableRuntimeComposites');
    expect(Table).toHaveProperty('lowerTables');
    expect(Table).toHaveProperty('compileTable');
    expect(Table).not.toHaveProperty('lowerTableWithArtifacts');
    expect(Table).toHaveProperty('TableTrackSizeKind');
    expect(Table).toHaveProperty('TableTrackSizeSchema');
    expect(Table).toHaveProperty('TableTrackOverridesSchema');
    expect(Table).toHaveProperty('TableCellSpanSchema');
    expect(Table).toHaveProperty('TableCellLayoutSchema');
    expect(Table).toHaveProperty('ManualTableCellSchema');
    expect(Table).not.toHaveProperty('TableCellSchema');
    expect(Table).not.toHaveProperty('TableCellAddressSchema');
    expect(Table).toHaveProperty('TableBorderSchema');
    expect(Table).toHaveProperty('TableLayoutManifestSchema');
    expect(Table).toHaveProperty('ResolvedTableBorderLineSchema');
    expect(Table).toHaveProperty('TableBorderContributionSchema');
    expect(Table).toHaveProperty('TableCellBackgroundSchema');
    expect(Table).toHaveProperty('TableCellContentStyleSchema');
    expect(Table).toHaveProperty('TableCellAppearanceSchema');
    expect(Table).toHaveProperty('TableCellSelectorSchema');
    expect(Table).toHaveProperty('TableValuePredicateSchema');
    expect(Table).toHaveProperty('TableCellRuleSchema');
    expect(Table).toHaveProperty('TableCellPlanSourceSchema');
    expect(Table).toHaveProperty('TableCellAppearanceTracePathSchema');
    expect(Table).toHaveProperty('TableCellVisualEncodingSchema');
    expect(Table).toHaveProperty('TableVisualScaleRefSchema');
    expect(Table).toHaveProperty('TableLegendDescriptorSchema');
    expect(Table).toHaveProperty('defineCellVisualScale');
    expect(Table).toHaveProperty('TableStyle');
    expect(Table).toHaveProperty('TableThemeMode');
    expect(Table).toHaveProperty('TableStyleTokenKeySchema');
    expect(Table).toHaveProperty('TableStyleBorderTokenSchema');
    expect(Table).toHaveProperty('TableStyleTokensSchema');
    expect(Table).toHaveProperty('TableStyleTokenMapSchema');
    expect(Table).toHaveProperty('BUILTIN_TABLE_STYLE_TOKENS');
    expect(Table).not.toHaveProperty('TableStyleTokenShape');
    expect(Table).toHaveProperty('TableCellSourceKind');
    expect(StructurePublic).not.toHaveProperty('TableCellSourceKind');

    expect(Table).not.toHaveProperty('emitTable');
    expect(Table).not.toHaveProperty('layoutTable');
    expect(Table).not.toHaveProperty('normalizeTableStructure');
    expect(Table).not.toHaveProperty('presentCellPayload');
    expect(Table).not.toHaveProperty('presentTable');
    expect(Table).not.toHaveProperty('resolveTableLayoutSpec');
    expect(Table).not.toHaveProperty('resolveTableTrackSizes');
    expect(Table).not.toHaveProperty('solveTableTracks');
    expect(Table).not.toHaveProperty('propagateTableSpanContributions');
    expect(Table).not.toHaveProperty('computeTableCellOuterSize');
    expect(Table).not.toHaveProperty('computeTableCellBox');
    expect(Table).not.toHaveProperty('computeTableCellContentBox');
    expect(Table).not.toHaveProperty('computeTableCellTranslation');
    expect(Table).not.toHaveProperty('computeTableCellFitScale');
    expect(Table).not.toHaveProperty('computeTableCellContentPlacement');
    expect(Table).not.toHaveProperty('buildTableBorderGraph');
    expect(Table).not.toHaveProperty('resolveTableBorderAtoms');
    expect(Table).not.toHaveProperty('mergeTableBorderAtoms');
    expect(Table).not.toHaveProperty('matchesTableCellSelector');
    expect(Table).not.toHaveProperty('matchesTableValuePredicate');
    expect(Table).not.toHaveProperty('resolveTableCellPlans');
    expect(Table).not.toHaveProperty('resolveTableStyleTokens');
    expect(Table).not.toHaveProperty('resolveCellVisualScale');
  });

  it('keeps public contract types while hiding pipeline stage types', () => {
    expectTypeOf<PublicContractTypes>().toBeArray();
    expectTypeOf<RemovedStageTypes>().toBeArray();
  });

  it('accepts row-major manual Cell and border fields and rejects removed fields', () => {
    const parsed = Table.TableStructureSchema.parse({
      kind: 'manual',
      rows: [
        [
          {
            value: 'x',
            span: { columns: 2 },
            layout: {
              padding: { x: 4, y: 2 },
              horizontalAlign: 'end',
              verticalAlign: 'start',
              wrap: true,
              fit: 'contain',
              overflow: 'clip',
              borders: { top: { kind: 'line', width: 2 } },
            },
          },
          null,
        ],
      ],
    });
    expect(parsed).toMatchObject({ kind: 'manual', rows: [[{ span: { columns: 2 } }, null]] });
    expect(Table.TableLayoutSchema.parse({ borders: { mode: 'collapse', outer: { kind: 'line' } } })).toEqual({
      borders: { mode: 'collapse', outer: { kind: 'line' } },
    });
    expect(() => Table.TableLayoutSchema.parse({ columnWidth: 120 })).toThrow();
  });
});
