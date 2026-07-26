import { describe, expect, expectTypeOf, it } from 'vitest';

import type * as TableTypes from '../src';

import * as Table from '../src';

type PublicContractTypes = [
  TableTypes.LowerTablesOptions,
  TableTypes.TableLoweringResult,
  TableTypes.TableRuntimeContributionInput,
  TableTypes.TableRuntimeContribution,
  TableTypes.TableLayoutManifest,
];

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
];

describe('@retikz/table public API', () => {
  it('exports stable runtime entries without exposing pipeline stages', () => {
    expect(Table).toHaveProperty('createTableRuntimeContribution');
    expect(Table).toHaveProperty('makeTableRuntimeComposites');
    expect(Table).toHaveProperty('lowerTables');
    expect(Table).toHaveProperty('lowerTableWithArtifacts');
    expect(Table).toHaveProperty('TableTrackSizeKind');
    expect(Table).toHaveProperty('TableTrackSizeSchema');
    expect(Table).toHaveProperty('TableTrackOverridesSchema');

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
  });

  it('keeps public contract types while hiding pipeline stage types', () => {
    expectTypeOf<PublicContractTypes>().toBeArray();
    expectTypeOf<RemovedStageTypes>().toBeArray();
  });

  it('rejects unsupported Cell span and layout schema fields', () => {
    expect(() =>
      Table.TableStructureSchema.parse({
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            address: { row: 0, column: 0 },
            payload: { kind: 'value', value: 'x' },
            span: { columns: 1 },
          },
        ],
      }),
    ).toThrow();
    for (const layout of [{ wrap: true }, { fit: 'contain' }, { overflow: 'clip' }]) {
      expect(() =>
        Table.TableStructureSchema.parse({
          kind: 'manual',
          rows: 1,
          columns: 1,
          cells: [
            {
              address: { row: 0, column: 0 },
              payload: { kind: 'value', value: 'x' },
              layout,
            },
          ],
        }),
      ).toThrow();
    }
    expect(() =>
      Table.TableStructureSchema.parse({
        kind: 'manual',
        rows: 1,
        columns: 1,
        cells: [
          {
            address: { row: 0, column: 0 },
            payload: { kind: 'value', value: 'x' },
            layout: { horizontalAlign: 'center' },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      Table.TableStructureSchema.parse({
        kind: 'detail',
        columns: [{ id: 'value', field: 'value', headerLayout: { padding: 1 } }],
      }),
    ).toThrow();
    expect(() =>
      Table.TableStructureSchema.parse({
        kind: 'detail',
        columns: [{ id: 'value', field: 'value', bodyLayout: { padding: 1 } }],
      }),
    ).toThrow();
  });
});
