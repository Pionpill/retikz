import { describe, expect, it } from 'vitest';

import {
  TableSchema,
  TableThemeTokenBorderSchema,
  TableThemeTokenKeySchema,
  TableThemeTokenMapSchema,
  TableThemeTokenOverridesSchema,
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

describe('Table theme token schema', () => {
  it('uses one closed 19-token vocabulary for required maps and partial overlays', () => {
    const required = TableThemeTokenMapSchema.parse(completeTokens);
    const partial = TableThemeTokenOverridesSchema.parse({ 'cell.content.color': '#334155' });
    expect(Object.keys(required)).toHaveLength(19);
    expect(TableThemeTokenKeySchema.options).toHaveLength(19);
    expect(partial).toEqual({ 'cell.content.color': '#334155' });
    expect(() => TableThemeTokenMapSchema.parse({ ...completeTokens, 'data.sequential': undefined })).toThrow(
      /data\.sequential/i,
    );
  });

  it('reports every unknown token at its own stable key path', () => {
    const invalid = { zUnknown: true, aUnknown: true };
    for (const schema of [TableThemeTokenOverridesSchema, TableThemeTokenMapSchema]) {
      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.error.issues.slice(0, 2).map(issue => issue.path)).toEqual([['aUnknown'], ['zUnknown']]);
      expect(result.error.issues.slice(0, 2).map(issue => issue.message)).toEqual([
        'Unknown table theme token "aUnknown"',
        'Unknown table theme token "zUnknown"',
      ]);
    }
  });

  it('reuses authoritative value boundaries and forbids public border priority', () => {
    expect(TableThemeTokenBorderSchema.parse({ kind: 'line', stroke: 'currentColor', width: 0 })).toEqual({
      kind: 'line',
      stroke: 'currentColor',
      width: 0,
    });
    expect(() => TableThemeTokenBorderSchema.parse({ kind: 'line', priority: 1 })).toThrow(/priority/i);
    expect(() => TableThemeTokenOverridesSchema.parse({ 'cell.background.fillOpacity': 2 })).toThrow();
    expect(() => TableThemeTokenOverridesSchema.parse({ 'cell.content.font.weight': 'heavy' })).toThrow();
    expect(() => TableThemeTokenOverridesSchema.parse({ 'cell.content.color': '  ' })).toThrow(
      'String must contain at least one non-whitespace character.',
    );
    expect(TableThemeTokenOverridesSchema.parse({ 'data.categorical': ['#fff', '#fff'] })).toEqual({
      'data.categorical': ['#fff', '#fff'],
    });
  });

  it('adds JSON-safe root Table tokens without materializing runtime defaults', () => {
    const base = { namespace: 'table', type: 'table', structure: { kind: 'manual', rows: [[1]] } };
    expect(TableSchema.parse(base)).toEqual(base);
    const styled = TableSchema.parse({
      ...base,
      tableThemeTokens: { 'cell.content.color': '#f5f5f5' },
    });
    expect(JSON.parse(JSON.stringify(styled))).toEqual(styled);
    expect(() => TableSchema.parse({ ...base, style: 'striped' })).toThrow();
    expect(() => TableSchema.parse({ ...base, themeMode: 'system' })).toThrow();
    expect(() => TableSchema.parse({ ...base, styleTokens: { callback: () => null } })).toThrow();
  });
});
