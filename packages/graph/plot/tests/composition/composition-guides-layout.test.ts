import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { PlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { AxisGridApplyTo, PlotSpecSchema } from '../../src/schemas';
import { migrateCompositionSpec, parseCompositionSpec } from './migrate-composition-spec';

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
    defaultScope: 'root',
    scopes: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
    facets: [
      {
        id: 'region',
        column: { field: 'region', order: ['north', 'south'] },
        scales: { roles: { y: 'shared' } },
      },
    ],
    layout: { panelGap: 24, axisGap: 8, labelGap: 6 },
    guidePolicy: { axes: 'outerShared', gridPlacement: 'self' },
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
    defaultScope: 'temp',
    scopes: [
      { id: 'temp', coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' } },
      {
        id: 'rain',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yRain' },
        placement: { kind: 'overlay', target: 'temp' },
      },
    ],
    layout: { axisGap: 12, labelGap: 5 },
  },
  marks: [
    { type: 'path', order: 'day', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'interval', coordinateScope: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' }, title: 'Temperature' },
    { type: 'axis', dimension: 'y', coordinateScope: 'rain', placement: { kind: 'side', side: 'left' }, title: 'Rainfall' },
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
    defaultScope: 'events',
    scaffolds: [
      {
        id: 'tracks',
        coordinate: { type: 'cartesian2D', x: 'xShared', y: 'yLane' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'events', band: { role: 'y', start: 0, end: 0.5 } },
          { id: 'volume', band: { role: 'y', start: 0.5, end: 1 } },
        ],
      },
    ],
    scopes: [
      { id: 'events', placement: { kind: 'track', scaffold: 'tracks', track: 'events' } },
      { id: 'volume', placement: { kind: 'track', scaffold: 'tracks', track: 'volume' } },
    ],
    layout: { trackGap: 20 },
    guidePolicy: { gridPlacement: 'sharedRole' },
  },
  marks: [
    { type: 'point', coordinateScope: 'events', encoding: { x: { field: 'eventX' }, y: { field: 'eventY' } } },
    { type: 'point', coordinateScope: 'volume', encoding: { x: { field: 'volumeX' }, y: { field: 'volumeY' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'x', coordinateScope: 'events', grid: true },
  ],
};

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [definition] = lowerPlots(datasets, { width: 480, height: 300, provenance: true });
  return definition.expand(spec) as IRScope;
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

describe('composition guides layout schema', () => {
  it('layout_and_guide_policy_round_trip', () => {
    const parsed = parseCompositionSpec(JSON.parse(JSON.stringify(facetSpec)));
    expect(parsed).toEqual(migrateCompositionSpec(facetSpec));
  });

  it('axis_grid_targeting_round_trip', () => {
    const spec = {
      ...lanesSpec,
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          coordinateScope: 'volume',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { track: { scaffold: 'tracks', id: ['volume'] } },
          },
        },
      ],
    };
    const parsed = parseCompositionSpec(JSON.parse(JSON.stringify(spec)));
    expect(parsed.guides?.[0]).toEqual((migrateCompositionSpec(spec) as { guides?: Array<unknown> }).guides?.[0]);
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
      parseCompositionSpec({
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
    expect(() => parseCompositionSpec(spec)).toThrow();
  });

  it('zero_gaps_are_valid', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        spacing: { panelGap: 0, trackGap: 0, axisGap: 0, labelGap: 0 },
      },
    };
    expect(parseCompositionSpec(spec).composition?.spacing).toEqual({
      panelGap: 0,
      trackGap: 0,
      axisGap: 0,
      labelGap: 0,
    });
  });
});

describe('composition guides layout lowering', () => {
  it('facet_outer_shared_axes_keeps_only_outer_shared_axis', () => {
    const outer = expandOf(parseCompositionSpec(facetSpec), { sales: salesRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(1);
  });

  it('independent_scale_facet_keeps_per_panel_axis_under_outer_shared_policy', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        facets: [{ id: 'region', column: { field: 'region' }, scales: { roles: { y: 'independent' } } }],
      },
    };
    const outer = expandOf(parseCompositionSpec(spec), { sales: salesRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(2);
  });

  it('panel_gap_changes_panel_translation_without_changing_panel_order', () => {
    const outer = expandOf(parseCompositionSpec(facetSpec), { sales: salesRows });
    const panels = panelScopesOf(outer);
    expect(panels.map(panel => String(panel.meta?.column))).toEqual(['north', 'south']);
    expect(panels[1].transforms).toEqual([{ kind: 'translate', x: 252, y: 0 }]);
  });

  it('overlay_same_side_axis_gap_offsets_axes', () => {
    const outer = expandOf(parseCompositionSpec(overlaySpec), { weather: weatherRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(2);
    expect(firstMoveX(yAxes[0]) - firstMoveX(yAxes[1])).toBeCloseTo(12, 6);
  });

  it('axis_title_outputs_label_without_changing_long_title_layout', () => {
    const longTitle = 'Revenue '.repeat(20);
    const spec = {
      ...overlaySpec,
      guides: [
        { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' }, title: longTitle },
      ],
    };
    const outer = expandOf(parseCompositionSpec(spec), { weather: weatherRows });
    const axis = axisLayersOf(outer)[0];
    expect(allNodes(axis).some(node => node.text === longTitle)).toBe(true);
  });

  it('facet_policy_omitted_uses_outer_shared_axes', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        guidePolicy: undefined,
      },
    };
    const outer = expandOf(parseCompositionSpec(JSON.parse(JSON.stringify(spec))), { sales: salesRows });
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(1);
  });

  it('grid_false_overrides_shared_role_default', () => {
    const spec = {
      ...facetSpec,
      guides: facetSpec.guides.map(guide => ({ ...guide, grid: false })),
    };
    const outer = expandOf(parseCompositionSpec(spec), { sales: salesRows });
    expect(gridLayersOf(outer)).toHaveLength(0);
  });

  it('facet_outer_shared_axes_can_keep_per_panel_grids', () => {
    const spec = {
      ...facetSpec,
      composition: {
        ...facetSpec.composition,
        guidePolicy: { axes: 'outerShared', gridPlacement: 'self' },
      },
    };
    const outer = expandOf(parseCompositionSpec(spec), { sales: salesRows });
    const panels = panelScopesOf(outer);
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');

    expect(yAxes).toHaveLength(1);
    expect(panels.map(panel => gridLayersOf(panel).length)).toEqual([2, 2]);
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
        facets: [
          {
            id: 'regionChannel',
            row: { field: 'channel', order: ['a', 'b'] },
            column: { field: 'region', order: ['north', 'south'] },
            scales: { roles: { y: 'shared' } },
          },
        ],
      },
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { facet: { id: 'regionChannel', row: ['b'] } },
          },
        },
      ],
    };
    const outer = expandOf(parseCompositionSpec(spec), { sales: salesByChannelRows });
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
        layout: { trackGap: 0 },
      },
    };
    const withGap = markLayersOf(expandOf(parseCompositionSpec(lanesSpec), { lanes: laneRows }));
    const withoutGap = markLayersOf(expandOf(parseCompositionSpec(noGapSpec), { lanes: laneRows }));
    const withGapDistance = Math.min(...allNodes(withGap[0]).map(node => (node.position as [number, number])[1])) -
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
    const withGapDistance = Math.min(...allNodes(withGap[0]).map(node => (node.position as [number, number])[1])) -
      Math.max(...allNodes(withGap[1]).map(node => (node.position as [number, number])[1]));
    const withoutGapDistance =
      Math.min(...allNodes(withoutGap[0]).map(node => (node.position as [number, number])[1])) -
      Math.max(...allNodes(withoutGap[1]).map(node => (node.position as [number, number])[1]));

    expect(withGapDistance).toBeGreaterThan(withoutGapDistance);
  });

  it('scaffold_shared_grid_keeps_one_grid_per_dimension', () => {
    const outer = expandOf(parseCompositionSpec(lanesSpec), { lanes: laneRows });
    const trackGridScopes = gridLayersOf(outer).map(layer => layer.meta?.track);
    expect(trackGridScopes).toEqual(['events', 'volume']);
  });

  it('scaffold_policy_omitted_projects_grid_to_shared_tracks', () => {
    const spec = {
      ...lanesSpec,
      composition: {
        ...lanesSpec.composition,
        guidePolicy: undefined,
      },
    };
    const outer = expandOf(parseCompositionSpec(JSON.parse(JSON.stringify(spec))), { lanes: laneRows });
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
          coordinateScope: 'volume',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { track: { scaffold: 'tracks', id: ['volume'] } },
          },
        },
      ],
    };
    const outer = expandOf(parseCompositionSpec(spec), { lanes: laneRows });
    expect(gridLayersOf(outer).map(layer => layer.meta?.track)).toEqual(['volume']);
  });

  it('grid_selector_matches_no_target_rejected', () => {
    const spec = {
      ...lanesSpec,
      guides: [
        {
          type: 'axis',
          dimension: 'x',
          coordinateScope: 'events',
          grid: {
            applyTo: AxisGridApplyTo.Selected,
            select: { track: { scaffold: 'tracks', id: ['missing'] } },
          },
        },
      ],
    };
    expect(() => expandOf(parseCompositionSpec(spec), { lanes: laneRows })).toThrow(/grid selector/i);
  });
});
