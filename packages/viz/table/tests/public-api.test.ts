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

type RemovedStageTypes = [
  RemovedResolvedTableLayoutSpec,
  RemovedTableTrackLayout,
  RemovedTableCellLayout,
  RemovedTableLayout,
  RemovedNormalizeTableStructureOptions,
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
  });

  it('keeps public contract types while hiding pipeline stage types', () => {
    expectTypeOf<PublicContractTypes>().toBeArray();
    expectTypeOf<RemovedStageTypes>().toBeArray();
  });
});
