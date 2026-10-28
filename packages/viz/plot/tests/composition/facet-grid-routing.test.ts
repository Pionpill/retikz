import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import type { IRPlot } from '../../src/schemas';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const salesRows = [
  { region: 'north', channel: 'online', month: 0, revenue: 0 },
  { region: 'north', channel: 'online', month: 1, revenue: 10 },
  { region: 'south', channel: 'online', month: 0, revenue: 100 },
  { region: 'south', channel: 'online', month: 1, revenue: 110 },
  { region: 'north', channel: 'store', month: 0, revenue: 4 },
];

const parsePlotIR = (spec: unknown): IRPlot => PlotSchema.parse(spec);

const facetArrangement = (arrangement: Record<string, unknown>): Record<string, unknown> => ({
  kind: 'facet',
  view: 'root',
  ...arrangement,
});

const baseFacetSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  composition: {
    defaultView: 'root',
    views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
    arrangements: [
      facetArrangement({
        id: 'region',
        column: { field: 'region', order: ['south'] },
        resolve: { scale: { y: 'independent' } },
      }),
    ],
  },
  marks: [
    {
      contributeToDomain: true,
      type: 'point',
      encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
    },
  ],
};

const expandOf = (
  spec: IRPlot,
  options: { width?: number; height?: number } = {},
  datasets: { sales: Array<Record<string, string | number>> } = { sales: salesRows },
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, {
    layout: { width: options.width ?? 480, height: options.height ?? 300 },
    textMeasurer: measureLabel,
  }).child as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const allNodes = (child: IRChild): Array<IRNode> => {
  if (isNode(child)) return [child];
  if (!isScope(child)) return [];
  return child.children.flatMap(allNodes);
};

const allScopes = (child: IRChild): Array<IRScope> => {
  if (!isScope(child)) return [];
  return [child, ...child.children.flatMap(allScopes)];
};

const facetPanelsOf = (scope: IRScope): Array<IRScope> =>
  scope.children.filter(isScope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'facetPanel');

const facetLabelsOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'facetLabel');

const panelKeyOf = (panel: IRScope): string => String(panel.meta?.column ?? panel.meta?.row ?? '');

const facetPanelMetaOf = (panel: IRScope): NonNullable<IRScope['meta']> => panel.meta ?? {};

const tupleMetaMatches = (value: unknown, expected: ReadonlyArray<unknown>): boolean =>
  Array.isArray(value) && expected.every((item, index) => value[index] === item);

const translateOf = (scope: IRScope): { x: number; y: number } => {
  const translate = scope.transforms?.find(transform => transform.kind === 'translate');
  return { x: translate?.x ?? 0, y: translate?.y ?? 0 };
};

describe('分面网格数据路由 schema', () => {
  it('分面列 schema 解析', () => {
    expect(parsePlotIR(baseFacetSpec)).toEqual(baseFacetSpec);
  });

  it('通过 json 进行切面网格往返', () => {
    const parsed = parsePlotIR(JSON.parse(JSON.stringify(baseFacetSpec)));

    expect(parsed).toEqual(baseFacetSpec);
  });

  it('方面行列显示空 schema 解析', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            row: { field: 'region', order: ['north', 'south'] },
            column: { field: 'channel', order: ['online', 'store'] },
            empty: 'show',
            resolve: { scale: { x: 'shared', y: 'shared' } },
          }),
        ],
      },
    };

    expect(parsePlotIR(spec)).toEqual(spec);
  });

  it('facet 多级维度 schema 解析', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            row: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            column: { field: 'month', order: [0, 1] },
          }),
        ],
      },
    };

    expect(parsePlotIR(spec)).toEqual(spec);
  });

  it('没有行或列的构面被拒绝', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [facetArrangement({ id: 'bad' })],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/row or column/);
  });

  it('重复的构面 ID 被拒绝', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({ id: 'region', column: { field: 'region' } }),
          facetArrangement({ id: 'region', column: { field: 'channel' } }),
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/duplicate arrangement/i);
  });

  it('方面 ID 与范围 ID 冲突被拒绝', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [facetArrangement({ id: 'root', column: { field: 'region' } })],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/arrangement/i);
  });

  it('未知时拒绝面尺度共享模式', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({ id: 'region', column: { field: 'region' }, resolve: { scale: { y: 'free' } } }),
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow();
  });
});

describe('小面网格数据路由下沉', () => {
  it('列 facet 按顺序生成面板范围', () => {
    const outer = expandOf(parsePlotIR(baseFacetSpec));
    const panels = facetPanelsOf(outer);

    expect(panels.map(panelKeyOf)).toEqual(['south', 'north']);
    expect(panels.map(panel => allNodes(panel).length)).toEqual([2, 3]);
  });

  it('行列空分面设为显示时生成所有组合', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            row: { field: 'region', order: ['north', 'south'] },
            column: { field: 'channel', order: ['online', 'store'] },
            empty: 'show',
          }),
        ],
      },
    };
    const outer = expandOf(parsePlotIR(spec));
    const panels = facetPanelsOf(outer);

    expect(panels).toHaveLength(4);
    expect(panels.map(panel => `${String(panel.meta?.row)}:${String(panel.meta?.column)}`)).toEqual([
      'north:online',
      'north:store',
      'south:online',
      'south:store',
    ]);
    expect(panels.map(panel => allNodes(panel).length)).toEqual([2, 1, 2, 0]);
  });

  it('多级行面路由元组面板值', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            row: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
          }),
        ],
      },
    };
    const outer = expandOf(parsePlotIR(spec));
    const panels = facetPanelsOf(outer);

    expect(panels.map(panel => panel.meta?.row)).toEqual([
      ['north', 'online'],
      ['north', 'store'],
      ['south', 'online'],
    ]);
    expect(panels.map(panel => panel.id)).toEqual([
      'region-channel.panel.north.online._',
      'region-channel.panel.north.store._',
      'region-channel.panel.south.online._',
    ]);
    expect(panels.map(panel => allNodes(panel).length)).toEqual([2, 1, 2]);
  });

  it('多级分面按级别对行和列标签条进行分组', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            header: { row: true, column: true },
            row: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            column: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            empty: 'show',
          }),
        ],
      },
    };

    const outer = expandOf(parsePlotIR(spec));
    const labelSummary = facetLabelsOf(outer).map(label => ({
      dimension: label.meta?.dimension,
      level: label.meta?.level,
      value: label.meta?.value,
      startIndex: label.meta?.startIndex,
      span: label.meta?.span,
    }));

    expect(labelSummary.filter(label => label.dimension === 'column')).toEqual([
      { dimension: 'column', level: 1, value: 'online', startIndex: 0, span: 1 },
      { dimension: 'column', level: 1, value: 'store', startIndex: 1, span: 1 },
      { dimension: 'column', level: 1, value: 'online', startIndex: 2, span: 1 },
      { dimension: 'column', level: 1, value: 'store', startIndex: 3, span: 1 },
      { dimension: 'column', level: 0, value: 'north', startIndex: 0, span: 2 },
      { dimension: 'column', level: 0, value: 'south', startIndex: 2, span: 2 },
    ]);
    expect(labelSummary.filter(label => label.dimension === 'row')).toEqual([
      { dimension: 'row', level: 1, value: 'online', startIndex: 0, span: 1 },
      { dimension: 'row', level: 1, value: 'store', startIndex: 1, span: 1 },
      { dimension: 'row', level: 1, value: 'online', startIndex: 2, span: 1 },
      { dimension: 'row', level: 1, value: 'store', startIndex: 3, span: 1 },
      { dimension: 'row', level: 0, value: 'north', startIndex: 0, span: 2 },
      { dimension: 'row', level: 0, value: 'south', startIndex: 2, span: 2 },
    ]);
    expect(facetLabelsOf(outer).map(label => allNodes(label).map(node => node.text))).toEqual([
      ['online'],
      ['store'],
      ['online'],
      ['store'],
      ['north'],
      ['south'],
      ['online'],
      ['store'],
      ['online'],
      ['store'],
      ['north'],
      ['south'],
    ]);
  });

  it.each([
    { header: { row: false, column: true }, expectedDimension: 'column' },
    { header: { row: true, column: false }, expectedDimension: 'row' },
  ] as const)('构面标题可见性对于每个维度都是独立的', ({ header, expectedDimension }) => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            header,
            row: { field: 'channel', order: ['online', 'store'] },
            column: { field: 'region', order: ['north', 'south'] },
          }),
        ],
      },
    };

    const labels = facetLabelsOf(expandOf(parsePlotIR(spec)));

    expect(labels.map(label => label.meta?.dimension)).toEqual([expectedDimension, expectedDimension]);
  });

  it('小平面标签带与面板网格保留标签间隙', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        spacing: { labelGap: 12 },
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            header: { row: true, column: true },
            row: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            column: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            empty: 'show',
          }),
        ],
      },
    };

    const outer = expandOf(parsePlotIR(spec), { width: 660, height: 480 });
    const panels = facetPanelsOf(outer);
    const firstPanel = panels.find(panel => {
      const meta = facetPanelMetaOf(panel);
      return tupleMetaMatches(meta.row, ['north']) && tupleMetaMatches(meta.column, ['north']);
    });
    const secondRowPanel = panels.find(panel => tupleMetaMatches(facetPanelMetaOf(panel).row, ['north', 'store']));

    expect(firstPanel).toBeDefined();
    expect(secondRowPanel).toBeDefined();
    expect(translateOf(firstPanel as IRScope).x).toBe(56);
    expect(translateOf(secondRowPanel as IRScope).y).toBe(106);
  });

  it('分面标签带使用一个标签带作为默认间隙', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            header: { row: true, column: true },
            row: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            column: [
              { field: 'region', order: ['north', 'south'] },
              { field: 'channel', order: ['online', 'store'] },
            ],
            empty: 'show',
          }),
        ],
      },
    };

    const outer = expandOf(parsePlotIR(spec), { width: 660, height: 480 });
    const firstPanel = facetPanelsOf(outer).find(panel => {
      const meta = facetPanelMetaOf(panel);
      return tupleMetaMatches(meta.row, ['north']) && tupleMetaMatches(meta.column, ['north']);
    });

    expect(firstPanel).toBeDefined();
    expect(translateOf(firstPanel as IRScope).x).toBe(66);
  });

  it('分面标题标签样式控制行旋转', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'channel',
            row: { field: 'channel', order: ['online', 'store'] },
            header: {
              row: {
                rotate: 0,
                maxTextWidth: 84,
                font: { size: 11 },
                textColor: '#334155',
              },
            },
          }),
        ],
      },
    };

    const parsed = parsePlotIR(spec);
    const outer = expandOf(parsed);
    const rowLabelNodes = facetLabelsOf(outer)
      .filter(label => label.meta?.dimension === 'row')
      .flatMap(allNodes);

    expect(rowLabelNodes.map(node => node.text)).toEqual(['online', 'store']);
    expect(rowLabelNodes.map(node => node.rotate)).toEqual([0, 0]);
    expect(rowLabelNodes.map(node => node.layout?.maxTextWidth)).toEqual([84, 84]);
    expect(rowLabelNodes.map(node => node.style?.textColor)).toEqual(['#334155', '#334155']);
  });

  it('排版在本地标题样式下提供构面标题默认值', () => {
    const spec = {
      ...baseFacetSpec,
      defaultPlot: {
        typography: {
          font: { family: 'Source Serif 4', size: 15 },
          textColor: '#0f766e',
          lineHeight: 1.4,
        },
      },
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            row: { field: 'region', order: ['north', 'south'] },
            column: { field: 'channel', order: ['online', 'store'] },
            header: {
              row: true,
              column: { textColor: '#2563eb', font: { weight: 700 } },
            },
          }),
        ],
      },
    };

    const outer = expandOf(parsePlotIR(spec));
    const rowNodes = facetLabelsOf(outer)
      .filter(label => label.meta?.dimension === 'row')
      .flatMap(allNodes);
    const columnNodes = facetLabelsOf(outer)
      .filter(label => label.meta?.dimension === 'column')
      .flatMap(allNodes);

    expect(rowNodes.length).toBeGreaterThan(0);
    expect(rowNodes.every(node => node.style?.textColor === '#0f766e')).toBe(true);
    expect(rowNodes.every(node => node.style?.font?.family === 'Source Serif 4' && node.style.font.size === 15)).toBe(
      true,
    );
    expect(rowNodes.every(node => node.layout?.lineHeight === 1.4)).toBe(true);
    expect(columnNodes.length).toBeGreaterThan(0);
    expect(columnNodes.every(node => node.style?.textColor === '#2563eb')).toBe(true);
    expect(
      columnNodes.every(
        node =>
          node.style?.font?.family === 'Source Serif 4' &&
          node.style.font.size === 15 &&
          node.style.font.weight === 700,
      ),
    ).toBe(true);
    expect(columnNodes.every(node => node.layout?.lineHeight === 1.4)).toBe(true);
  });

  it('小平面尺寸标签覆盖标题文本块', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'channel',
            row: {
              field: 'channel',
              order: ['online', 'store'],
              labels: [
                {
                  value: 'online',
                  label: [
                    { text: 'online', fill: '#0ea5e9', font: { size: 13, weight: 700 } },
                    { text: '24 commits', fill: '#64748b', font: { size: 9 } },
                  ],
                },
              ],
            },
            header: {
              row: {
                rotate: 0,
                font: { size: 10 },
                textColor: '#334155',
              },
            },
          }),
        ],
      },
    };

    const parsed = parsePlotIR(spec);
    const outer = expandOf(parsed);
    const rowLabelNodes = facetLabelsOf(outer)
      .filter(label => label.meta?.dimension === 'row')
      .flatMap(allNodes);

    expect(rowLabelNodes.map(node => node.text)).toEqual([
      [
        { text: 'online', fill: '#0ea5e9', font: { size: 13, weight: 700 } },
        { text: '24 commits', fill: '#64748b', font: { size: 9 } },
      ],
      'store',
    ]);
    expect(rowLabelNodes.map(node => node.style?.textColor)).toEqual(['#334155', '#334155']);
  });

  it('行列面将宽度高度视为图表总大小', () => {
    const rows = [
      { region: 'north', channel: 'online', month: 1, revenue: 58 },
      { region: 'south', channel: 'online', month: 1, revenue: 42 },
      { region: 'west', channel: 'online', month: 1, revenue: 76 },
      { region: 'north', channel: 'store', month: 1, revenue: 44 },
      { region: 'south', channel: 'store', month: 1, revenue: 36 },
      { region: 'west', channel: 'store', month: 1, revenue: 51 },
    ];
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        spacing: { panelGap: 24 },
        arrangements: [
          facetArrangement({
            id: 'region-channel',
            row: { field: 'channel', order: ['online', 'store'] },
            column: { field: 'region', order: ['north', 'south', 'west'] },
          }),
        ],
      },
    };

    const outer = expandOf(parsePlotIR(spec), { width: 660, height: 480 }, { sales: rows });
    const panels = facetPanelsOf(outer);
    const southOnline = panels.find(panel => {
      const meta = facetPanelMetaOf(panel);
      return meta.row === 'online' && meta.column === 'south';
    });
    const northStore = panels.find(panel => {
      const meta = facetPanelMetaOf(panel);
      return meta.row === 'store' && meta.column === 'north';
    });

    expect(southOnline).toBeDefined();
    expect(northStore).toBeDefined();
    expect(translateOf(southOnline as IRScope)).toEqual({ x: 228, y: 0 });
    expect(translateOf(northStore as IRScope)).toEqual({ x: 0, y: 252 });
  });

  it('独立 y 比例尺使用面板局部定义域', () => {
    const outer = expandOf(parsePlotIR(baseFacetSpec));
    const [south, north] = facetPanelsOf(outer);
    const southNodes = allNodes(south);
    const northNodes = allNodes(north);
    const southTopY = Math.min(...southNodes.map(node => (node.position as [number, number])[1]));
    const northTopY = Math.min(...northNodes.map(node => (node.position as [number, number])[1]));

    expect(northTopY).toBeCloseTo(southTopY, 6);
  });

  it('共享 y 比例使用所有面板行作为域', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [
          facetArrangement({
            id: 'region',
            column: { field: 'region', order: ['south'] },
            resolve: { scale: { y: 'shared' } },
          }),
        ],
      },
    };
    const outer = expandOf(parsePlotIR(spec));
    const [south, north] = facetPanelsOf(outer);
    const southNodes = allNodes(south);
    const northNodes = allNodes(north);
    const southTopY = Math.min(...southNodes.map(node => (node.position as [number, number])[1]));
    const northTopY = Math.min(...northNodes.map(node => (node.position as [number, number])[1]));

    expect(northTopY).toBeGreaterThan(southTopY);
  });

  it('同步 y 比例使用所有面板行作为域', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth' },
        { type: 'linear', name: 'yRevenue' },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
        arrangements: [
          {
            kind: 'facet',
            id: 'region',
            view: 'root',
            column: { field: 'region', order: ['south'] },
            resolve: { scale: { y: 'synchronized' } },
          },
        ],
      },
      marks: [
        {
          contributeToDomain: true,
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
      ],
    };
    const outer = expandOf(PlotSchema.parse(spec));
    const [south, north] = facetPanelsOf(outer);
    const southNodes = allNodes(south);
    const northNodes = allNodes(north);
    const southTopY = Math.min(...southNodes.map(node => (node.position as [number, number])[1]));
    const northTopY = Math.min(...northNodes.map(node => (node.position as [number, number])[1]));

    expect(northTopY).toBeGreaterThan(southTopY);
  });

  it('分面字段缺失时明确报错', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [facetArrangement({ id: 'missing', column: { field: 'missingField' } })],
      },
    };

    expect(() => expandOf(parsePlotIR(spec))).toThrow(/missingField/);
  });
});
