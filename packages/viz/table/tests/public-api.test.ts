import { describe, expect, it } from 'vitest';

import * as Table from '../src';
import * as StructurePublic from '../src/contract/structure/public';

describe('@retikz/table public API', () => {
  it('exports the runtime contribution, compile, schema, and manifest surface without pipeline stages', () => {
    expect(Table).toHaveProperty('createTableRuntimeContribution');
    expect(Table).toHaveProperty('createTableProvider');
    expect(Table).not.toHaveProperty('makeTableRuntimeComposites');
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
    expect(Table).toHaveProperty('defineTableThemeStyle');
    expect(Table).toHaveProperty('TableThemeTokenKeySchema');
    expect(Table).toHaveProperty('TableThemeTokenBorderSchema');
    expect(Table).toHaveProperty('TableThemeTokenOverridesSchema');
    expect(Table).toHaveProperty('TableThemeTokenMapSchema');
    expect(Table).toHaveProperty('getDefaultTableThemePreset');
    expect(Table).not.toHaveProperty('BUILTIN_TABLE_THEME_TOKENS');
    expect(Table).not.toHaveProperty('TableStyle');
    expect(Table).not.toHaveProperty('TableThemeMode');
    expect(Table).not.toHaveProperty('TableStyleTokenShape');
    expect(Table).toHaveProperty('TableCellSourceKind');
    expect(StructurePublic).not.toHaveProperty('TableCellSourceKind');

    expect(Table).not.toHaveProperty('emitTable');
    expect(Table).not.toHaveProperty('layoutTable');
    expect(Table).not.toHaveProperty('normalizeTableStructure');
    expect(Table).not.toHaveProperty('presentCellPayload');
    expect(Table).not.toHaveProperty('presentTable');
    expect(Table).not.toHaveProperty('resolveTableLayout');
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
    expect(Table).toHaveProperty('resolveTableThemeTokens');
    expect(Table).not.toHaveProperty('resolveCellVisualScale');
  });

  it('accepts row-major manual Cell and border fields', () => {
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
  });
});
