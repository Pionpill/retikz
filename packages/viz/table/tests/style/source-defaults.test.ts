import { describe, expect, it } from 'vitest';

import { compileTable, TableLayoutManifestSchema, TableSchema } from '../../src';

const baseManual = {
  namespace: 'table',
  type: 'table',
  structure: {
    kind: 'manual',
    rows: [['Header'], ['a'], [0], [10]],
    rowKinds: ['columnHeader', 'body', 'body', 'body'],
  },
} as const;

const sparseDefaults = {
  appearanceDefaults: {
    body: {
      background: { fill: '#f8fafc', fillOpacity: 0.75 },
      content: {
        style: { color: '#0f172a' },
        defaults: { node: { style: { font: { family: 'serif' } } }, label: { font: { weight: 500 } } },
      },
    },
    columnHeader: {
      background: { fill: '#e2e8f0' },
      content: { style: { color: '#111827' }, defaults: { node: { style: { font: { weight: 700 } } } } },
      borders: { bottom: { kind: 'line', stroke: '#94a3b8', width: 1 } },
    },
  },
  layout: {
    borders: {
      outer: {
        top: { kind: 'line', stroke: '#0f172a', width: 1 },
        right: { kind: 'none' },
        bottom: { kind: 'line', stroke: '#334155', width: 2 },
        left: { kind: 'line', stroke: '#475569', width: 3 },
      },
      horizontal: { kind: 'line', stroke: '#cbd5e1', width: 1 },
      vertical: { kind: 'none' },
    },
  },
  visualDefaults: {
    categorical: ['#2563eb', '#f97316'],
    sequential: ['#eff6ff', '#1d4ed8'],
  },
  tableDefaults: {
    appearanceDefaults: { body: { background: { fill: '#fee2e2' } } },
    layout: { borders: { outer: { top: { kind: 'line', stroke: '#dc2626', width: 1 } } } },
    visualDefaults: { categorical: ['#16a34a', '#ca8a04'], sequential: ['#f0fdf4', '#166534'] },
  },
} as const;

const parseTable = (source: unknown) => TableSchema.parse(JSON.parse(JSON.stringify(source)));

const compileSource = (source: unknown) =>
  compileTable(parseTable(source), {}, { theme: { mode: 'light' }, compile: { padding: 0 } });

describe('Table Source defaults', () => {
  it('accepts sparse appearance, side-specific border, visual, and table defaults', () => {
    const source = { ...baseManual, ...sparseDefaults };
    const parsed = parseTable(source);

    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
    expect(parsed.layout?.borders?.outer).toEqual(source.layout.borders.outer);
  });

  it('rejects legacy token bags, a single outer candidate, and non-default table fields', () => {
    const legacy = TableSchema.safeParse({ ...baseManual, tableThemeTokens: { 'cell.content.color': '#111' } });
    expect(legacy.success).toBe(false);

    const singleOuter = TableSchema.safeParse({
      ...baseManual,
      layout: { borders: { outer: { kind: 'line', stroke: '#111111' } } },
    });
    expect(singleOuter.success).toBe(false);

    for (const tableDefaults of [
      { data: { reference: 'rows' } },
      { id: 'forbidden' },
      { structure: { kind: 'manual', rows: [['x']] } },
      { rules: [] },
      { encodings: [] },
      { layout: { columnSize: { kind: 'fixed', value: 10 } } },
      { layout: { columnGap: 4 } },
      { appearanceDefaults: { body: { content: { children: [] } } } },
    ]) {
      expect(TableSchema.safeParse({ ...baseManual, tableDefaults }).success).toBe(false);
    }
  });

  it('keeps the cascade at formal field granularity and creates no objects for empty tables', () => {
    const result = compileSource({
      ...baseManual,
      id: 'cascade',
      ...sparseDefaults,
      appearanceDefaults: {
        body: { background: { fill: '#bfdbfe', fillOpacity: 0 }, content: { style: { color: '#1d4ed8' } } },
        columnHeader: sparseDefaults.appearanceDefaults.columnHeader,
      },
      layout: {
        borders: {
          outer: { top: { kind: 'line', stroke: '#2563eb', width: 2 } },
          horizontal: { kind: 'line', stroke: '#64748b', width: 1 },
        },
      },
      rules: [{ selector: { locations: ['body'] }, appearance: { background: { fill: '#16a34a' } } }],
    });
    const body = result.manifest.cells.find(cell => cell.location === 'body');
    const top = result.manifest.borders.find(edge => edge.start.y === 0 && edge.end.y === 0);

    expect(body?.appearance).toMatchObject({ background: { fill: '#16a34a', fillOpacity: 0 } });
    expect(top?.style).toMatchObject({ stroke: '#2563eb', width: 2 });
    expect(body?.appearanceTrace).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/background/fill' })]),
    );

    const empty = compileSource({
      ...baseManual,
      structure: { kind: 'manual', rows: [[null, null]], rowKinds: ['body'] },
      tableDefaults: sparseDefaults.tableDefaults,
    });
    expect(empty.manifest.cells).toEqual([]);
    expect(empty.manifest.borders).toEqual([]);
    expect(empty.manifest.encodings).toEqual([]);
    expect(empty.manifest.legendDescriptors).toEqual([]);
  });

  it('allows cleared visual defaults when no encoding consumes them', () => {
    const result = compileSource({
      ...baseManual,
      visualDefaults: { categorical: null, sequential: null },
    });

    expect(result.manifest.encodings).toEqual([]);
    expect(result.manifest.legendDescriptors).toEqual([]);
  });

  it('uses formal palettes in builtin scales and keeps explicit ranges highest', () => {
    const result = compileSource({
      ...baseManual,
      id: 'consumer',
      structure: {
        kind: 'manual',
        rows: [['Header'], ['a'], ['b'], [0], [10]],
        rowKinds: ['columnHeader', 'body', 'body', 'body', 'body'],
      },
      appearanceDefaults: sparseDefaults.appearanceDefaults,
      visualDefaults: sparseDefaults.visualDefaults,
      encodings: [
        {
          id: 'categorical',
          selector: { rowIndices: [1, 2] },
          channel: 'contentColor',
          scale: { name: 'ordinal-color' },
          legend: { title: 'Category' },
        },
        {
          id: 'sequential',
          selector: { rowIndices: [3, 4] },
          channel: 'backgroundFill',
          scale: { name: 'sequential-color', options: { range: ['#111111', '#eeeeee'] } },
          legend: { title: 'Value' },
        },
      ],
    });

    expect(result.manifest.cells.find(cell => cell.rowIndex === 1)?.appearance.content?.style?.color).toBe('#2563eb');
    expect(result.manifest.cells.find(cell => cell.rowIndex === 3)?.appearance.background?.fill).toBe(
      'rgb(17, 17, 17)',
    );
    expect(result.manifest.legendDescriptors).toEqual([
      expect.objectContaining({ encodingId: 'categorical', range: ['#2563eb', '#f97316'] }),
      expect.objectContaining({ encodingId: 'sequential', range: ['#111111', '#eeeeee'] }),
    ]);

    const manifest = TableLayoutManifestSchema.parse(result.manifest);
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain('tableThemeTokens');
    expect(serialized).not.toContain('cell.content.color');
    expect(serialized).toContain('$spec/appearanceDefaults');
    expect(serialized).toContain('$spec/visualDefaults');
  });
});
