import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { AxisGridApplyTo, PlotSpecSchema } from '../../src/schemas';

const salesRows = [
  { region: 'north', month: 0, revenue: 10 },
  { region: 'north', month: 1, revenue: 20 },
  { region: 'south', month: 0, revenue: 100 },
  { region: 'south', month: 1, revenue: 120 },
];

const salesByChannelRows = [
  { region: 'north', channel: 'a', month: 0, revenue: 10 },
  { region: 'north', channel: 'b', month: 1, revenue: 20 },
  { region: 'south', channel: 'a', month: 0, revenue: 100 },
  { region: 'south', channel: 'b', month: 1, revenue: 120 },
];

const weatherRows = [
  { day: 0, temperature: 10, rainfall: 100 },
  { day: 1, temperature: 20, rainfall: 50 },
  { day: 2, temperature: 15, rainfall: 80 },
];

const laneRows = [
  { eventX: 0, eventY: 1, volumeX: 0, volumeY: 100 },
  { eventX: 1, eventY: 2, volumeX: 1, volumeY: 200 },
];

const parsePlotSpec = (spec: unknown): IRPlotSpec => PlotSpecSchema.parse(spec);

const facetSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'sales',
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
        column: { field: 'region', order: ['north', 'south'] },
        resolve: { scale: { y: 'shared' } },
      },
    ],
    spacing: { panelGap: 24, axisGap: 8, labelGap: 6 },
    resolve: { axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } },
  },
  marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  guides: [
    { type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'bottom' }, grid: true, title: 'Month' },
    { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'left' }, grid: true, title: 'Revenue' },
  ],
};

const overlaySpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'weather',
  data: { reference: 'weather' },
  scales: [
    { type: 'linear', name: 'xDay' },
    { type: 'linear', name: 'yTemp' },
    { type: 'linear', name: 'yRain' },
  ],
  composition: {
    defaultView: 'temp',
    views: [
      { id: 'temp', coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' } },
      {
        id: 'rain',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yRain' },
        placement: { kind: 'overlay', target: 'temp' },
      },
    ],
    spacing: { axisGap: 12, labelGap: 5 },
  },
  marks: [
    { type: 'path', order: 'day', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'interval', coordinateView: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [
    {
      type: 'axis',
      dimension: 'y',
      coordinateView: 'temp',
      placement: { kind: 'side', side: 'left' },
      title: 'Temperature',
    },
    {
      type: 'axis',
      dimension: 'y',
      coordinateView: 'rain',
      placement: { kind: 'side', side: 'left' },
      title: 'Rainfall',
    },
  ],
};

const lanesSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'lanes',
  data: { reference: 'lanes' },
  scales: [
    { type: 'linear', name: 'xShared' },
    { type: 'linear', name: 'yLane' },
  ],
  composition: {
    defaultView: 'events',
    arrangements: [
      {
        kind: 'tracks',
        id: 'tracks',
        coordinate: { type: 'cartesian2D', x: 'xShared', y: 'yLane' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'events', view: 'events', band: { role: 'y', start: 0, end: 0.5 } },
          { id: 'volume', view: 'volume', band: { role: 'y', start: 0.5, end: 1 } },
        ],
      },
    ],
    spacing: { trackGap: 20 },
    resolve: { grid: { x: 'all', y: 'all' } },
  },
  marks: [
    { type: 'point', coordinateView: 'events', encoding: { x: { field: 'eventX' }, y: { field: 'eventY' } } },
    { type: 'point', coordinateView: 'volume', encoding: { x: { field: 'volumeX' }, y: { field: 'volumeY' } } },
  ],
  guides: [{ type: 'axis', dimension: 'x', coordinateView: 'events', grid: true }],
};

const expandOf = (spec: IRPlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [definition] = lowerPlots(datasets, { width: 480, height: 300, provenance: true });
  return definition.expand(spec).children[0] as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';
const isPath = (child: IRChild): child is IRPath => child.type === 'path';

const allScopes = (child: IRChild): Array<IRScope> => {
  if (!isScope(child)) return [];
  return [child, ...child.children.flatMap(allScopes)];
};

const allNodes = (child: IRChild): Array<IRNode> => {
  if (isNode(child)) return [child];
  if (!isScope(child)) return [];
  return child.children.flatMap(allNodes);
};

const firstPathOf = (scope: IRScope): IRPath => scope.children.find(isPath) as IRPath;

const firstMoveX = (scope: IRScope): number => {
  const move = firstPathOf(scope).children.find(step => step.kind === 'move');
  return (move?.to as [number, number])[0];
};

const panelScopesOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'facetPanel');

const axisLayersOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'axis');

const gridLayersOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'grid');

const markLayersOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'mark');

const nodeYSpanOf = (scope: IRScope): number => {
  const ys = allNodes(scope).map(node => (node.position as [number, number])[1]);
  return Math.max(...ys) - Math.min(...ys);
};

describe('composition guides layout schema', () => {
  it('layout_and_guide_policy_round_trip', () => {
    const parsed = parsePlotSpec(JSON.parse(JSON.stringify(facetSpec)));
    expect(parsed).toEqual(facetSpec);
  });

  it('axis_grid_targeting_round_trip', () => {
    const spec = {
      ...lanesSpec,
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          coordinateView: 'volume',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { track: { arrangement: 'tracks', id: ['volume'] } },
          },
        },
      ],
    };
    const parsed = parsePlotSpec(JSON.parse(JSON.stringify(spec)));
    expect(parsed.guides?.[0]).toEqual(spec.guides[0]);
  });

  it('legacy_composition_grid_policy_is_rejected', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        guidePolicy: { grid: 'shared' },
      },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  it('selected_grid_without_selector_is_rejected', () => {
    expect(() =>
      parsePlotSpec({
        ...lanesSpec,
        guides: [{ type: 'axis', dimension: 'x', grid: { applyTo: AxisGridApplyTo.Selected } }],
      }),
    ).toThrow(/select/i);
  });

  it('negative_gap_rejected', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        spacing: { panelGap: -1 },
      },
    };
    expect(() => parsePlotSpec(spec)).toThrow();
  });

  it('zero_gaps_are_valid', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        spacing: { panelGap: 0, trackGap: 0, axisGap: 0, labelGap: 0 },
      },
    };
    expect(parsePlotSpec(spec).composition?.spacing).toEqual({
      panelGap: 0,
      trackGap: 0,
      axisGap: 0,
      labelGap: 0,
    });
  });
});

describe('composition guides layout lowering', () => {
  it('facet_outer_shared_axes_keeps_only_outer_shared_axis', () => {
    const outer = expandOf(parsePlotSpec(facetSpec), { sales: salesRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(1);
  });

  it('outer_shared_x_axis_does_not_shrink_last_row_facet_data_viewport', () => {
    const rows = ['a', 'b', 'c'].flatMap(row => [
      { row, month: 0, revenue: 0 },
      { row, month: 1, revenue: 100 },
    ]);
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        arrangements: [
          {
            kind: 'facet',
            id: 'rowFacet',
            view: 'root',
            row: { field: 'row', order: ['a', 'b', 'c'] },
            resolve: { scale: { x: 'shared', y: 'shared' }, axis: { x: 'outer', y: 'outer' }, grid: { y: 'local' } },
          },
        ],
        resolve: undefined,
      },
      guides: [
        { type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'bottom' }, title: 'Month' },
        { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'left' }, title: 'Revenue' },
      ],
    };

    const outer = expandOf(parsePlotSpec(spec), { sales: rows });
    const panels = panelScopesOf(outer);
    const spans = panels.map(panel => nodeYSpanOf(markLayersOf(panel)[0]));
    const xAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'x');

    expect(xAxes).toHaveLength(1);
    expect(spans).toHaveLength(3);
    expect(spans[1]).toBeCloseTo(spans[0], 6);
    expect(spans[2]).toBeCloseTo(spans[0], 6);
  });

  it('independent_scale_facet_keeps_per_panel_axis_under_outer_shared_policy', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        arrangements: [
          {
            kind: 'facet',
            id: 'region',
            view: 'root',
            column: { field: 'region' },
            resolve: { scale: { y: 'independent' } },
          },
        ],
      },
    };
    const outer = expandOf(parsePlotSpec(spec), { sales: salesRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(2);
  });

  it('panel_gap_changes_panel_translation_without_changing_panel_order', () => {
    const outer = expandOf(parsePlotSpec(facetSpec), { sales: salesRows });
    const panels = panelScopesOf(outer);
    expect(panels.map(panel => String(panel.meta?.column))).toEqual(['north', 'south']);
    expect(panels[1].transforms).toEqual([{ kind: 'translate', x: 252, y: 0 }]);
  });

  it('overlay_same_side_axis_gap_offsets_axes', () => {
    const outer = expandOf(parsePlotSpec(overlaySpec), { weather: weatherRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(2);
    expect(firstMoveX(yAxes[0]) - firstMoveX(yAxes[1])).toBeCloseTo(12, 6);
  });

  it('axis_title_outputs_label_without_changing_long_title_layout', () => {
    const longTitle = 'Revenue '.repeat(20);
    const spec = {
      ...overlaySpec,
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          coordinateView: 'temp',
          placement: { kind: 'side', side: 'left' },
          title: longTitle,
        },
      ],
    };
    const outer = expandOf(parsePlotSpec(spec), { weather: weatherRows });
    const axis = axisLayersOf(outer)[0];
    expect(allNodes(axis).some(node => node.text === longTitle)).toBe(true);
  });

  it('facet_policy_omitted_uses_outer_shared_axes', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        resolve: undefined,
      },
    };
    const outer = expandOf(parsePlotSpec(JSON.parse(JSON.stringify(spec))), { sales: salesRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(1);
  });

  it('grid_false_overrides_shared_role_default', () => {
    const spec = {
      ...facetSpec,
      guides: facetSpec.guides.map(guide => ({ ...guide, grid: false })),
    };
    const outer = expandOf(parsePlotSpec(spec), { sales: salesRows });
    expect(gridLayersOf(outer)).toHaveLength(0);
  });

  it('theme_default_grid_enters_facet_policy_before_dimension_override', () => {
    const spec = {
      ...facetSpec,
      guides: facetSpec.guides.map(guide => ({ ...guide, grid: undefined })),
      plotThemeTokens: {
        'axis.grid.enabled': false,
        'axis.grid.stroke': '#ffffff',
        'axis.grid.drawOpacity': 0.15,
      },
      plotThemeTokenRules: [
        {
          select: { dimension: 'y' },
          tokens: { 'axis.grid.enabled': true },
        },
      ],
    };
    const outer = expandOf(parsePlotSpec(spec), { sales: salesRows });
    const panels = panelScopesOf(outer);

    expect(panels.map(panel => gridLayersOf(panel).map(layer => layer.meta?.dimension))).toEqual([['y'], ['y']]);
    expect(panels.flatMap(gridLayersOf).every(layer => firstPathOf(layer).stroke === '#ffffff')).toBe(true);
  });

  it('facet_outer_shared_axes_can_keep_per_panel_grids', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        resolve: { axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } },
      },
    };
    const outer = expandOf(parsePlotSpec(spec), { sales: salesRows });
    const panels = panelScopesOf(outer);
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');

    expect(yAxes).toHaveLength(1);
    expect(panels.map(panel => gridLayersOf(panel).length)).toEqual([2, 2]);
  });

  it('facet_local_guides_use_panel_local_ids', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        resolve: { axis: { x: 'local', y: 'local' }, grid: { x: 'local', y: 'local' } },
      },
    };
    const outer = expandOf(parsePlotSpec(spec), { sales: salesRows });
    const panels = panelScopesOf(outer);
    const ids = panels.flatMap(panel => [...gridLayersOf(panel), ...axisLayersOf(panel)].map(layer => layer.id));

    expect(ids).toEqual([
      'sales.view.region_panel___north.grid.x',
      'sales.view.region_panel___north.grid.y',
      'sales.view.region_panel___north.axis.x',
      'sales.view.region_panel___north.axis.y',
      'sales.view.region_panel___south.grid.x',
      'sales.view.region_panel___south.grid.y',
      'sales.view.region_panel___south.axis.x',
      'sales.view.region_panel___south.axis.y',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('facet_local_resolve_overrides_composition_grid_default', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth' },
        { type: 'linear', name: 'yRevenue' },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
        resolve: { grid: { y: 'none' } },
        arrangements: [
          {
            kind: 'facet',
            id: 'region',
            view: 'root',
            column: { field: 'region', order: ['north', 'south'] },
            resolve: { grid: { y: 'all' } },
          },
        ],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [{ type: 'axis', dimension: 'y', grid: true }],
    });
    const outer = expandOf(spec, { sales: salesRows });
    const panels = panelScopesOf(outer);

    expect(panels.map(panel => gridLayersOf(panel).length)).toEqual([1, 1]);
  });

  it('facet_axis_none_suppresses_matching_axis_role', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
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
            column: { field: 'region', order: ['north', 'south'] },
            resolve: { axis: { y: 'none' } },
          },
        ],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
    });
    const outer = expandOf(spec, { sales: salesRows });

    expect(axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y')).toHaveLength(0);
    expect(axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'x').length).toBeGreaterThan(0);
  });

  it('facet_selected_grid_targets_only_matching_panels', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        arrangements: [
          {
            kind: 'facet',
            id: 'regionChannel',
            view: 'root',
            row: { field: 'channel', order: ['a', 'b'] },
            column: { field: 'region', order: ['north', 'south'] },
            resolve: { scale: { y: 'shared' } },
          },
        ],
      },
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { facet: { arrangement: 'regionChannel', row: ['b'] } },
          },
        },
      ],
    };
    const outer = expandOf(parsePlotSpec(spec), { sales: salesByChannelRows });
    const panels = panelScopesOf(outer);

    expect(panels.map(panel => [panel.meta?.row, gridLayersOf(panel).length])).toEqual([
      ['a', 0],
      ['a', 0],
      ['b', 1],
      ['b', 1],
    ]);
  });

  it('track_gap_opens_space_between_adjacent_track_bands', () => {
    const noGapSpec = {
      ...lanesSpec,
      composition: {
        ...lanesSpec.composition,
        spacing: { trackGap: 0 },
      },
    };
    const withGap = markLayersOf(expandOf(parsePlotSpec(lanesSpec), { lanes: laneRows }));
    const withoutGap = markLayersOf(expandOf(parsePlotSpec(noGapSpec), { lanes: laneRows }));
    const withGapDistance =
      Math.min(...allNodes(withGap[0]).map(node => (node.position as [number, number])[1])) -
      Math.max(...allNodes(withGap[1]).map(node => (node.position as [number, number])[1]));
    const withoutGapDistance =
      Math.min(...allNodes(withoutGap[0]).map(node => (node.position as [number, number])[1])) -
      Math.max(...allNodes(withoutGap[1]).map(node => (node.position as [number, number])[1]));
    expect(withGapDistance).toBeGreaterThan(withoutGapDistance);
  });

  it('track_local_spacing_opens_space_between_adjacent_track_bands', () => {
    const directLanesSpec = {
      namespace: 'plot',
      type: 'plot',
      id: 'lanes',
      data: { reference: 'lanes' },
      scales: [
        { type: 'linear', name: 'xShared' },
        { type: 'linear', name: 'yLane' },
      ],
      composition: {
        defaultView: 'events',
        arrangements: [
          {
            kind: 'tracks',
            id: 'tracks',
            coordinate: { type: 'cartesian2D', x: 'xShared', y: 'yLane' },
            sharedRoles: ['x'],
            spacing: { trackGap: 18 },
            tracks: [
              { id: 'events', view: 'events', band: { role: 'y', start: 0, end: 0.5 } },
              { id: 'volume', view: 'volume', band: { role: 'y', start: 0.5, end: 1 } },
            ],
          },
        ],
      },
      marks: [
        { type: 'point', coordinateView: 'events', encoding: { x: { field: 'eventX' }, y: { field: 'eventY' } } },
        { type: 'point', coordinateView: 'volume', encoding: { x: { field: 'volumeX' }, y: { field: 'volumeY' } } },
      ],
      guides: [],
    };
    const noGapSpec = PlotSpecSchema.parse({
      ...directLanesSpec,
      composition: {
        ...directLanesSpec.composition,
        arrangements: [
          {
            ...directLanesSpec.composition.arrangements[0],
            spacing: { trackGap: 0 },
          },
        ],
      },
    });
    const withGap = markLayersOf(expandOf(PlotSpecSchema.parse(directLanesSpec), { lanes: laneRows }));
    const withoutGap = markLayersOf(expandOf(noGapSpec, { lanes: laneRows }));
    const withGapDistance =
      Math.min(...allNodes(withGap[0]).map(node => (node.position as [number, number])[1])) -
      Math.max(...allNodes(withGap[1]).map(node => (node.position as [number, number])[1]));
    const withoutGapDistance =
      Math.min(...allNodes(withoutGap[0]).map(node => (node.position as [number, number])[1])) -
      Math.max(...allNodes(withoutGap[1]).map(node => (node.position as [number, number])[1]));

    expect(withGapDistance).toBeGreaterThan(withoutGapDistance);
  });

  it('scaffold_shared_grid_keeps_one_grid_per_dimension', () => {
    const outer = expandOf(parsePlotSpec(lanesSpec), { lanes: laneRows });
    const trackGridScopes = gridLayersOf(outer).map(layer => layer.meta?.track);
    expect(trackGridScopes).toEqual(['events', 'volume']);
  });

  it('scaffold_policy_omitted_projects_grid_to_shared_tracks', () => {
    const spec = {
      ...lanesSpec,
      composition: {
        ...lanesSpec.composition,
        resolve: undefined,
      },
    };
    const outer = expandOf(parsePlotSpec(JSON.parse(JSON.stringify(spec))), { lanes: laneRows });
    const trackGridScopes = gridLayersOf(outer).map(layer => layer.meta?.track);
    expect(trackGridScopes).toEqual(['events', 'volume']);
  });

  it('selected_track_grid_targets_only_named_track', () => {
    const spec = {
      ...lanesSpec,
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          coordinateView: 'volume',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { track: { arrangement: 'tracks', id: ['volume'] } },
          },
        },
      ],
    };
    const outer = expandOf(parsePlotSpec(spec), { lanes: laneRows });
    expect(gridLayersOf(outer).map(layer => layer.meta?.track)).toEqual(['volume']);
  });

  it('grid_selector_matches_no_target_rejected', () => {
    const spec = {
      ...lanesSpec,
      guides: [
        {
          type: 'axis',
          dimension: 'x',
          coordinateView: 'events',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { track: { arrangement: 'tracks', id: ['missing'] } },
          },
        },
      ],
    };
    expect(() => expandOf(parsePlotSpec(spec), { lanes: laneRows })).toThrow(/grid selector/i);
  });
});
