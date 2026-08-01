import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRTableStyleTokens, TableStyleTokenKey, TableStyleTokenMap } from '../../src';

import {
  TableSpecSchema,
  TableStyle,
  TableStyleBorderTokenSchema,
  TableStyleTokenKeySchema,
  TableStyleTokenMapSchema,
  TableStyleTokensSchema,
  TableThemeMode,
} from '../../src';

const completeTokens = {
  'cell.background.fill': '#ffffff',
  'cell.background.fillOpacity': 1,
  'cell.content.color': '#111111',
  'cell.content.font.family': 'sans-serif',
  'cell.content.font.weight': 400,
  'columnHeader.background.fill': '#f5f5f5',
  'columnHeader.background.fillOpacity': 1,
  'columnHeader.content.color': '#222222',
  'columnHeader.content.font.family': 'sans-serif',
  'columnHeader.content.font.weight': 600,
  'table.border.top': null,
  'table.border.right': null,
  'table.border.bottom': null,
  'table.border.left': null,
  'table.border.horizontal': { kind: 'line', stroke: '#dddddd', width: 1 },
  'table.border.vertical': null,
  'columnHeader.border.bottom': { kind: 'line', stroke: '#cccccc', width: 1 },
  'data.categorical': ['#ff0000', '#00ff00'],
  'data.sequential': ['#ffffff', '#000000'],
} as const;

describe('Table style schema', () => {
  it('uses one closed 19-token vocabulary for required maps and partial overlays', () => {
    const required = TableStyleTokenMapSchema.parse(completeTokens);
    const partial = TableStyleTokensSchema.parse({ 'cell.content.color': '#334155' });

    expectTypeOf(required).toEqualTypeOf<TableStyleTokenMap>();
    expectTypeOf(partial).toEqualTypeOf<IRTableStyleTokens>();
    expect(Object.keys(required)).toHaveLength(19);
    expect(TableStyleTokenKeySchema.options).toHaveLength(19);
    expectTypeOf(TableStyleTokenKeySchema.parse('data.sequential')).toEqualTypeOf<TableStyleTokenKey>();
    expect(partial).toEqual({ 'cell.content.color': '#334155' });
    expect(() => TableStyleTokenMapSchema.parse({ ...completeTokens, 'data.sequential': undefined })).toThrow(
      /data\.sequential/i,
    );
  });

  it('reports every unknown token at its own stable key path', () => {
    const invalid = { zUnknown: true, aUnknown: true };
    for (const schema of [TableStyleTokensSchema, TableStyleTokenMapSchema]) {
      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.error.issues.slice(0, 2).map(issue => issue.path)).toEqual([['aUnknown'], ['zUnknown']]);
      expect(result.error.issues.slice(0, 2).map(issue => issue.message)).toEqual([
        'Unknown table style token "aUnknown"',
        'Unknown table style token "zUnknown"',
      ]);
    }
  });

  it('reuses authoritative value boundaries and forbids public border priority', () => {
    expect(TableStyleBorderTokenSchema.parse({ kind: 'line', stroke: 'currentColor', width: 0 })).toEqual({
      kind: 'line',
      stroke: 'currentColor',
      width: 0,
    });
    expect(() => TableStyleBorderTokenSchema.parse({ kind: 'line', priority: 1 })).toThrow(/priority/i);
    expect(() => TableStyleTokensSchema.parse({ 'cell.background.fillOpacity': 2 })).toThrow();
    expect(() => TableStyleTokensSchema.parse({ 'cell.content.font.weight': 'heavy' })).toThrow();
    expect(() => TableStyleTokensSchema.parse({ 'data.categorical': ['#fff', '#fff'] })).toThrow(/unique/i);
  });

  it('adds JSON-safe root style fields without materializing runtime defaults', () => {
    const base = { namespace: 'table', type: 'table', structure: { kind: 'manual', rows: [[1]] } };
    expect(TableSpecSchema.parse(base)).toEqual(base);
    const styled = TableSpecSchema.parse({
      ...base,
      style: TableStyle.Academic,
      themeMode: TableThemeMode.Dark,
      styleTokens: { 'cell.content.color': '#f5f5f5' },
    });
    expect(JSON.parse(JSON.stringify(styled))).toEqual(styled);
    expect(() => TableSpecSchema.parse({ ...base, style: 'striped' })).toThrow(/style/i);
    expect(() => TableSpecSchema.parse({ ...base, themeMode: 'system' })).toThrow(/themeMode/i);
    expect(() => TableSpecSchema.parse({ ...base, styleTokens: { callback: () => null } })).toThrow();
  });
});
