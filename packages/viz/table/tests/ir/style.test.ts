import { describe, expect, it } from 'vitest';

import { TableDefaultsSchema, TableSchema, TableVisualDefaultsSchema } from '../../src';

const validDefaults = {
  appearanceDefaults: {
    body: {
      background: { fill: 0.2, fillOpacity: 0.5 },
      content: { style: { color: '#334155' } },
    },
    columnHeader: {
      background: { fill: '#f8fafc' },
      borders: { bottom: { kind: 'line', stroke: 0.8 } },
    },
  },
  layout: {
    borders: {
      outer: { top: { kind: 'line', stroke: 0.6, width: 2 } },
      horizontal: { kind: 'line', stroke: '#cbd5e1' },
    },
  },
  visualDefaults: { categorical: ['#fff', '#000'], sequential: ['#eff6ff', '#1d4ed8'] },
} as const;

describe('Table Source defaults schema', () => {
  it('accepts sparse appearance, border, and visual defaults', () => {
    expect(TableDefaultsSchema.parse(validDefaults)).toEqual(validDefaults);
    expect(TableVisualDefaultsSchema.parse(validDefaults.visualDefaults)).toEqual(validDefaults.visualDefaults);
  });

  it('rejects unknown fields and invalid values through the strict owner schemas', () => {
    expect(() => TableDefaultsSchema.parse({ unknown: true })).toThrow(/unknown/i);
    expect(() => TableDefaultsSchema.parse({ visualDefaults: { categorical: [] } })).toThrow(/categorical/i);
    expect(() => TableDefaultsSchema.parse({ visualDefaults: { sequential: ['#fff'] } })).toThrow(/sequential/i);
    expect(() => TableDefaultsSchema.parse({ appearanceDefaults: { body: { content: { children: [] } } } })).toThrow(
      /children|unrecognized/i,
    );
    expect(() => TableDefaultsSchema.parse({ layout: { borders: { outer: { kind: 'line' } } } })).toThrow(
      /outer|unrecognized/i,
    );
  });

  it('accepts JSON-safe root Source fragments without materializing runtime defaults', () => {
    const base = { namespace: 'table', type: 'table', structure: { kind: 'manual', rows: [[1]] } };
    expect(TableSchema.parse(base)).toEqual(base);
    const styled = TableSchema.parse({
      ...base,
      appearanceDefaults: validDefaults.appearanceDefaults,
      layout: validDefaults.layout,
      visualDefaults: validDefaults.visualDefaults,
      tableDefaults: { visualDefaults: validDefaults.visualDefaults },
    });
    expect(JSON.parse(JSON.stringify(styled))).toEqual(styled);
    expect(() => TableSchema.parse({ ...base, tableThemeTokens: { 'cell.content.color': '#f5f5f5' } })).toThrow();
    expect(() => TableSchema.parse({ ...base, style: 'striped' })).toThrow();
    expect(() => TableSchema.parse({ ...base, themeMode: 'system' })).toThrow();
    expect(() => TableSchema.parse({ ...base, styleTokens: { callback: () => null } })).toThrow();
  });
});
