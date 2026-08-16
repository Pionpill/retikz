import type { IRChild, IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { IRPlot } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSchema } from '../../src/schemas';

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
  marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};

const expandOf = (
  spec: IRPlot,
  options: { width?: number; height?: number } = {},
  datasets: { sales: Array<Record<string, string | number>> } = { sales: salesRows },
): IRScope => {
  const [definition] = lowerPlots(datasets, { width: options.width ?? 480, height: options.height ?? 300 });
  return definition.expand(spec).children[0] as IRScope;
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

describe('facet grid data routing schema', () => {
  it('facet_column_schema_parses', () => {
    expect(parsePlotIR(baseFacetSpec)).toEqual(baseFacetSpec);
  });

  it('facet_grid_round_trips_through_json', () => {
    const parsed = parsePlotIR(JSON.parse(JSON.stringify(baseFacetSpec)));
    expect(parsed).toEqual(baseFacetSpec);
  });

  it('facet_row_column_show_empty_schema_parses', () => {
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

  it('facet_multi_level_dimension_schema_parses', () => {
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

  it('facet_without_row_or_column_rejected', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [facetArrangement({ id: 'bad' })],
      },
    };
    expect(() => parsePlotIR(spec)).toThrow(/row or column/);
  });

  it('duplicate_facet_id_rejected', () => {
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

  it('facet_id_conflicting_with_scope_id_rejected', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        arrangements: [facetArrangement({ id: 'root', column: { field: 'region' } })],
      },
    };
    expect(() => parsePlotIR(spec)).toThrow(/arrangement/i);
  });

  it('facet_scale_sharing_mode_rejected_when_unknown', () => {
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

describe('facet grid data routing lowering', () => {
  it('column_facet_generates_panel_scopes_in_order', () => {
    const outer = expandOf(parsePlotIR(baseFacetSpec));
    const panels = facetPanelsOf(outer);
    expect(panels.map(panelKeyOf)).toEqual(['south', 'north']);
    expect(panels.map(panel => allNodes(panel).length)).toEqual([2, 3]);
  });

  it('row_column_empty_show_generates_all_combinations', () => {
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

  it('multi_level_row_facet_routes_tuple_panel_values', () => {
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

  it('multi_level_facet_groups_row_and_column_label_strips_by_level', () => {
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
  ] as const)('facet_header_visibility_is_independent_per_dimension', ({ header, expectedDimension }) => {
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

  it('facet_label_bands_reserve_label_gap_from_panel_grid', () => {
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

  it('facet_label_bands_use_one_label_band_as_default_gap', () => {
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

  it('facet_header_label_style_controls_row_rotation', () => {
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
    expect(rowLabelNodes.map(node => node.maxTextWidth)).toEqual([84, 84]);
    expect(rowLabelNodes.map(node => node.textColor)).toEqual(['#334155', '#334155']);
  });

  it('typography_supplies_facet_header_defaults_beneath_local_header_style', () => {
    const spec = {
      ...baseFacetSpec,
      plotTheme: {
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
    expect(rowNodes.every(node => node.textColor === '#0f766e')).toBe(true);
    expect(rowNodes.every(node => node.font?.family === 'Source Serif 4' && node.font.size === 15)).toBe(true);
    expect(rowNodes.every(node => node.lineHeight === 1.4)).toBe(true);
    expect(columnNodes.length).toBeGreaterThan(0);
    expect(columnNodes.every(node => node.textColor === '#2563eb')).toBe(true);
    expect(
      columnNodes.every(
        node => node.font?.family === 'Source Serif 4' && node.font.size === 15 && node.font.weight === 700,
      ),
    ).toBe(true);
    expect(columnNodes.every(node => node.lineHeight === 1.4)).toBe(true);
  });

  it('facet_dimension_labels_override_header_text_blocks', () => {
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
    expect(rowLabelNodes.map(node => node.textColor)).toEqual(['#334155', '#334155']);
  });

  it('row_column_facet_treats_width_height_as_total_chart_size', () => {
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

  it('independent_y_scale_uses_panel_local_domain', () => {
    const outer = expandOf(parsePlotIR(baseFacetSpec));
    const [south, north] = facetPanelsOf(outer);
    const southNodes = allNodes(south);
    const northNodes = allNodes(north);
    const southTopY = Math.min(...southNodes.map(node => (node.position as [number, number])[1]));
    const northTopY = Math.min(...northNodes.map(node => (node.position as [number, number])[1]));
    expect(northTopY).toBeCloseTo(southTopY, 6);
  });

  it('shared_y_scale_uses_all_panel_rows_for_domain', () => {
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

  it('synchronized_y_scale_uses_all_panel_rows_for_domain', () => {
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
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    };
    const outer = expandOf(PlotSchema.parse(spec));
    const [south, north] = facetPanelsOf(outer);
    const southNodes = allNodes(south);
    const northNodes = allNodes(north);
    const southTopY = Math.min(...southNodes.map(node => (node.position as [number, number])[1]));
    const northTopY = Math.min(...northNodes.map(node => (node.position as [number, number])[1]));
    expect(northTopY).toBeGreaterThan(southTopY);
  });

  it('missing_facet_field_fails_loudly', () => {
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
