import { defineTheme } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { compileTable, defineTableTheme, mergeTableDefaults, TableLayoutManifestSchema, TableSchema } from '../../src';

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
  defaultAppearance: {
    body: {
      background: { fill: '#f8fafc', fillOpacity: 0.75 },
      content: {
        defaults: {
          style: { color: '#0f172a' },
          node: { style: { font: { family: 'serif' } }, label: { font: { weight: 500 } } },
          path: { label: { font: { weight: 500 } } },
        },
      },
    },
    columnHeader: {
      background: { fill: '#e2e8f0' },
      content: { defaults: { style: { color: '#111827' }, node: { style: { font: { weight: 700 } } } } },
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
  defaultVisual: {
    categorical: ['#2563eb', '#f97316'],
    sequential: ['#eff6ff', '#1d4ed8'],
  },
  defaultTable: {
    defaultAppearance: { body: { background: { fill: '#fee2e2' } } },
    layout: { borders: { outer: { top: { kind: 'line', stroke: '#dc2626', width: 1 } } } },
    defaultVisual: { categorical: ['#16a34a', '#ca8a04'], sequential: ['#f0fdf4', '#166534'] },
  },
} as const;

const parseTable = (source: unknown) => TableSchema.parse(JSON.parse(JSON.stringify(source)));

const compileSource = (source: unknown) =>
  compileTable(parseTable(source), {}, { theme: { mode: 'light' }, compile: { padding: 0 } });

describe('默认为 Table Source', () => {
  it('接受稀疏外观、特定于侧面的边框、视觉和表格默认值', () => {
    const source = { ...baseManual, ...sparseDefaults };
    const parsed = parseTable(source);

    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
    expect(parsed.layout?.borders?.outer).toEqual(source.layout.borders.outer);
  });

  it('拒绝遗留令牌包、单个外部候选者和非默认表字段', () => {
    const legacy = TableSchema.safeParse({ ...baseManual, tableThemeTokens: { 'cell.content.color': '#111' } });

    expect(legacy.success).toBe(false);

    const singleOuter = TableSchema.safeParse({
      ...baseManual,
      layout: { borders: { outer: { kind: 'line', stroke: '#111111' } } },
    });

    expect(singleOuter.success).toBe(false);

    for (const defaultTable of [
      { data: { reference: 'rows' } },
      { id: 'forbidden' },
      { structure: { kind: 'manual', rows: [['x']] } },
      { rules: [] },
      { encodings: [] },
      { layout: { columnSize: { kind: 'fixed', value: 10 } } },
      { layout: { columnGap: 4 } },
      { defaultAppearance: { body: { content: { children: [] } } } },
    ]) {
      expect(TableSchema.safeParse({ ...baseManual, defaultTable }).success).toBe(false);
    }
  });

  it('将级联保持在正式字段粒度，并且不为空表创建对象', () => {
    const result = compileSource({
      ...baseManual,
      id: 'cascade',
      ...sparseDefaults,
      defaultAppearance: {
        body: {
          background: { fill: '#bfdbfe', fillOpacity: 0 },
          content: { defaults: { style: { color: '#1d4ed8' } } },
        },
        columnHeader: sparseDefaults.defaultAppearance.columnHeader,
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
      defaultTable: sparseDefaults.defaultTable,
    });

    expect(empty.manifest.cells).toEqual([]);
    expect(empty.manifest.borders).toEqual([]);
    expect(empty.manifest.encodings).toEqual([]);
    expect(empty.manifest.legendDescriptors).toEqual([]);
  });

  it('当没有编码消费它们时，允许清除视觉默认值', () => {
    const result = compileSource({
      ...baseManual,
      defaultVisual: { categorical: null, sequential: null },
    });

    expect(result.manifest.encodings).toEqual([]);
    expect(result.manifest.legendDescriptors).toEqual([]);
  });

  it('使用内置比例的正式调色板，并保持显式范围最高', () => {
    const result = compileSource({
      ...baseManual,
      id: 'consumer',
      structure: {
        kind: 'manual',
        rows: [['Header'], ['a'], ['b'], [0], [10]],
        rowKinds: ['columnHeader', 'body', 'body', 'body', 'body'],
      },
      defaultAppearance: sparseDefaults.defaultAppearance,
      defaultVisual: sparseDefaults.defaultVisual,
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

    expect(result.manifest.cells.find(cell => cell.rowIndex === 1)?.appearance.content?.defaults?.style?.color).toBe(
      '#2563eb',
    );
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
    expect(serialized).toContain('$spec/defaultAppearance');
    expect(serialized).toContain('$spec/defaultVisual');
  });
});

describe('Cell 填充默认值', () => {
  const options = {
    theme: { name: 'padding', mode: 'light' },
    lower: {
      tableThemeDefinitions: [
        defineTableTheme({
          name: 'padding',
          resolve: () => ({ defaults: { defaultCellLayout: { body: { padding: 4 }, columnHeader: { padding: 6 } } } }),
        }),
      ],
    },
    compile: { padding: 0, themeDefinitions: [defineTheme({ name: 'padding', resolve: () => ({}) })] },
  } as const;

  it('保留稀疏 JSON 填充默认值并拒绝无效填充和不相关字段', () => {
    const source = {
      ...baseManual,
      defaultCellLayout: { body: { padding: 0 }, columnHeader: { padding: { left: 4 } } },
    };
    expect(parseTable(source)).toEqual(source);
    for (const body of [{ padding: -1 }, { padding: { left: -1 } }, { wrap: true }]) {
      expect(TableSchema.safeParse({ ...baseManual, defaultCellLayout: { body } }).success).toBe(false);
    }
  });

  it('将主题填充应用于详细单元格，保留显式零并记录解析的默认值', () => {
    const source = parseTable({
      namespace: 'table',
      type: 'table',
      data: { reference: 'rows' },
      layout: { columnSize: { kind: 'fixed', value: 40 }, rowSize: { kind: 'fixed', value: 30 } },
      structure: {
        kind: 'detail',
        columns: [
          { id: 'a', field: 'a' },
          { id: 'b', field: 'b', headerLayout: { padding: 0 }, bodyLayout: { padding: 0 } },
        ],
      },
    });
    const result = compileTable(source, { rows: [{ a: 1, b: 2 }] }, options);
    expect(result.manifest.cells.map(cell => cell.contentBox)).toEqual([
      { x: 6, y: 6, width: 28, height: 18 },
      { x: 40, y: 0, width: 40, height: 30 },
      { x: 4, y: 34, width: 32, height: 22 },
      { x: 40, y: 30, width: 40, height: 30 },
    ]);
    expect(TableLayoutManifestSchema.parse(result.manifest).style.defaults.defaultCellLayout).toEqual({
      body: { padding: 4 },
      columnHeader: { padding: 6 },
    });
    expect(JSON.stringify(source)).not.toContain('defaultCellLayout');
  });

  it('让 Source 覆盖 defaultTable 和 Cell 覆盖 Source 而不更改其他区域', () => {
    const result = compileTable(
      parseTable({
        ...baseManual,
        defaultTable: { defaultCellLayout: { body: { padding: 8 }, columnHeader: { padding: 2 } } },
        defaultCellLayout: { body: { padding: 3 } },
        structure: {
          kind: 'manual',
          rows: [['H'], ['x'], [{ value: 'y', layout: { padding: 0 } }]],
          rowKinds: ['columnHeader', 'body', 'body'],
        },
      }),
      {},
      options,
    );
    expect(result.manifest.cells.map(cell => cell.contentBox.x)).toEqual([2, 3, 0]);
    expect(result.manifest.style.layers).toContainEqual({
      kind: 'source',
      path: '$spec/defaultCellLayout',
      defaults: { defaultCellLayout: { body: { padding: 3 } } },
    });
  });

  it('将间距对象替换为单位，并用 null 清除继承的填充', () => {
    const current = { defaultCellLayout: { body: { padding: { left: 9, right: 8 } } } };
    expect(
      mergeTableDefaults(current, { defaultCellLayout: { body: { padding: { top: 2 } } } }).defaultCellLayout,
    ).toEqual({ body: { padding: { top: 2 } } });
    for (const defaultCellLayout of [null, { body: null }, { body: { padding: null } }]) {
      const result = compileTable(parseTable({ ...baseManual, defaultTable: { defaultCellLayout } }), {}, options);
      expect(result.manifest.cells[1].contentBox.x).toBe(0);
    }
  });

  it('在自动跟踪贡献中包含主题填充，而无需创建单元格', () => {
    const source = parseTable({
      ...baseManual,
      structure: { kind: 'manual', rows: [['x']] },
      layout: { columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } },
    });
    const plain = compileTable(source, {}, { compile: { padding: 0 } });
    const padded = compileTable(source, {}, options);
    expect(padded.manifest.cells[0].box.width - plain.manifest.cells[0].box.width).toBeCloseTo(8);
    expect(padded.manifest.cells[0].box.height - plain.manifest.cells[0].box.height).toBeCloseTo(8);
    expect(
      compileTable(parseTable({ ...baseManual, structure: { kind: 'manual', rows: [[null]] } }), {}, options).manifest
        .cells,
    ).toEqual([]);
  });
});

describe('Core 图形默认在 Table 内容中', () => {
  it('继承描边和效果叶，而 null 仅清除选定的叶', () => {
    const source = {
      ...baseManual,
      defaultTable: {
        defaultAppearance: {
          body: {
            content: {
              defaults: {
                style: {
                  dashPattern: [3, 2],
                  dashOffset: -2,
                  lineCap: 'round',
                  lineJoin: 'bevel',
                  shadow: 'sm',
                  blendMode: 'multiply',
                },
              },
            },
          },
        },
      },
      defaultAppearance: { body: { content: { defaults: { style: { dashOffset: null, shadow: null } } } } },
    };
    const result = compileSource(source);
    const body = result.manifest.cells.find(cell => cell.location === 'body');
    const style = body?.appearance.content?.defaults?.style;
    expect(style).toMatchObject({ dashPattern: [3, 2], lineCap: 'round', lineJoin: 'bevel', blendMode: 'multiply' });
    expect(style?.dashOffset).toBeUndefined();
    expect(style?.shadow).toBeUndefined();
  });
});
