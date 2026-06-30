import type { IRChild, IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { PlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSpecSchema } from '../../src/schemas';

const salesRows = [
  { region: 'north', channel: 'online', month: 0, revenue: 0 },
  { region: 'north', channel: 'online', month: 1, revenue: 10 },
  { region: 'south', channel: 'online', month: 0, revenue: 100 },
  { region: 'south', channel: 'online', month: 1, revenue: 110 },
  { region: 'north', channel: 'store', month: 0, revenue: 4 },
];

const baseFacetSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  composition: {
    defaultScope: 'root',
    scopes: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
    facets: [
      {
        id: 'region',
        column: { field: 'region', order: ['south'] },
        scales: { roles: { y: 'independent' } },
      },
    ],
  },
  marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};

const expandOf = (
  spec: PlotSpec,
  options: { width?: number; height?: number } = {},
  datasets: { sales: Array<Record<string, string | number>> } = { sales: salesRows },
): IRScope => {
  const [definition] = lowerPlots(datasets, { width: options.width ?? 480, height: options.height ?? 300 });
  return definition.expand(spec) as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const allNodes = (child: IRChild): Array<IRNode> => {
  if (isNode(child)) return [child];
  if (!isScope(child)) return [];
  return child.children.flatMap(allNodes);
};

const facetPanelsOf = (scope: IRScope): Array<IRScope> =>
  scope.children
    .filter(isScope)
    .filter(child => child.meta?.source === 'plot' && child.meta.layer === 'facetPanel');

const panelKeyOf = (panel: IRScope): string => String(panel.meta?.column ?? panel.meta?.row ?? '');

const facetPanelMetaOf = (panel: IRScope): NonNullable<IRScope['meta']> => panel.meta ?? {};

const translateOf = (scope: IRScope): { x: number; y: number } => {
  const translate = scope.transforms?.find(transform => transform.kind === 'translate');
  return { x: translate?.x ?? 0, y: translate?.y ?? 0 };
};

describe('facet grid data routing schema', () => {
  it('facet_column_schema_parses', () => {
    expect(PlotSpecSchema.parse(baseFacetSpec)).toEqual(baseFacetSpec);
  });

  it('facet_grid_round_trips_through_json', () => {
    const parsed = PlotSpecSchema.parse(JSON.parse(JSON.stringify(baseFacetSpec)));
    expect(parsed).toEqual(baseFacetSpec);
  });

  it('facet_row_column_show_empty_schema_parses', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        facets: [
          {
            id: 'region-channel',
            row: { field: 'region', order: ['north', 'south'] },
            column: { field: 'channel', order: ['online', 'store'] },
            empty: 'show',
            scales: { roles: { x: 'shared', y: 'shared' } },
          },
        ],
      },
    };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it('facet_without_row_or_column_rejected', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        facets: [{ id: 'bad' }],
      },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow(/row or column/);
  });

  it('duplicate_facet_id_rejected', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        facets: [
          { id: 'region', column: { field: 'region' } },
          { id: 'region', column: { field: 'channel' } },
        ],
      },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow(/duplicate facet/i);
  });

  it('facet_id_conflicting_with_scope_id_rejected', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        facets: [{ id: 'root', column: { field: 'region' } }],
      },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow(/scope/i);
  });

  it('facet_scale_sharing_mode_rejected_when_unknown', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        facets: [{ id: 'region', column: { field: 'region' }, scales: { roles: { y: 'free' } } }],
      },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });
});

describe('facet grid data routing lowering', () => {
  it('column_facet_generates_panel_scopes_in_order', () => {
    const outer = expandOf(PlotSpecSchema.parse(baseFacetSpec));
    const panels = facetPanelsOf(outer);
    expect(panels.map(panelKeyOf)).toEqual(['south', 'north']);
    expect(panels.map(panel => allNodes(panel).length)).toEqual([2, 3]);
  });

  it('row_column_empty_show_generates_all_combinations', () => {
    const spec = {
      ...baseFacetSpec,
      composition: {
        ...baseFacetSpec.composition,
        facets: [
          {
            id: 'region-channel',
            row: { field: 'region', order: ['north', 'south'] },
            column: { field: 'channel', order: ['online', 'store'] },
            empty: 'show',
          },
        ],
      },
    };
    const outer = expandOf(PlotSpecSchema.parse(spec));
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
        layout: { panelGap: 24 },
        facets: [
          {
            id: 'region-channel',
            row: { field: 'channel', order: ['online', 'store'] },
            column: { field: 'region', order: ['north', 'south', 'west'] },
          },
        ],
      },
    };

    const outer = expandOf(PlotSpecSchema.parse(spec), { width: 660, height: 480 }, { sales: rows });
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
    const outer = expandOf(PlotSpecSchema.parse(baseFacetSpec));
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
        facets: [{ id: 'region', column: { field: 'region', order: ['south'] }, scales: { roles: { y: 'shared' } } }],
      },
    };
    const outer = expandOf(PlotSpecSchema.parse(spec));
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
        facets: [{ id: 'missing', column: { field: 'missingField' } }],
      },
    };
    expect(() => expandOf(PlotSpecSchema.parse(spec))).toThrow(/missingField/);
  });
});
