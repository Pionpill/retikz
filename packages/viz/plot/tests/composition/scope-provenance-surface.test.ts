import type { IRChild, IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src/schemas';

import { createPlotLocator, lowerPlots } from '../../src';
import { PlotSpecSchema } from '../../src/schemas';

const weatherRows = [
  { region: 'north', day: 0, temperature: 10, rainfall: 100 },
  { region: 'south', day: 0, temperature: 20, rainfall: 50 },
  { region: 'north', day: 1, temperature: 15, rainfall: 80 },
  { region: 'south', day: 1, temperature: 25, rainfall: 70 },
];

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
  },
  marks: [
    { type: 'point', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'point', coordinateView: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'y', coordinateView: 'temp', placement: { kind: 'side', side: 'left' } },
    { type: 'axis', dimension: 'y', coordinateView: 'rain', placement: { kind: 'side', side: 'right' } },
  ],
};

const facetSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'sales',
  data: { reference: 'weather' },
  scales: [
    { type: 'linear', name: 'xDay' },
    { type: 'linear', name: 'yTemp' },
  ],
  composition: {
    defaultView: 'root',
    views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' } }],
    arrangements: [
      { kind: 'facet', id: 'region', view: 'root', column: { field: 'region', order: ['north', 'south'] } },
    ],
  },
  marks: [{ type: 'point', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } }],
};

const trackSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'tracks',
  data: { reference: 'weather' },
  scales: [
    { type: 'linear', name: 'xDay' },
    { type: 'linear', name: 'yValue' },
  ],
  composition: {
    defaultView: 'temp',
    arrangements: [
      {
        kind: 'tracks',
        id: 'lanes',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yValue' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'temp', view: 'temp', band: { role: 'y', start: 0, end: 0.45 } },
          { id: 'rain', view: 'rain', band: { role: 'y', start: 0.55, end: 1 } },
        ],
      },
    ],
  },
  marks: [
    { type: 'point', coordinateView: 'temp', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'point', coordinateView: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [{ type: 'axis', dimension: 'x', coordinateView: 'rain', grid: true }],
};

const parsePlotSpec = (spec: unknown): IRPlotSpec => PlotSpecSchema.parse(spec);

const expandOf = (spec: IRPlotSpec): IRScope => {
  const [definition] = lowerPlots(
    { weather: weatherRows },
    { width: 480, height: 300, provenance: true, datumProvenance: true },
  );
  return definition.expand(spec) as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const allScopes = (child: IRChild): Array<IRScope> => {
  if (!isScope(child)) return [];
  return [child, ...child.children.flatMap(allScopes)];
};

const allNodes = (child: IRChild): Array<IRNode> => {
  if (isNode(child)) return [child];
  if (!isScope(child)) return [];
  return child.children.flatMap(allNodes);
};

const markLayersOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'mark');

const gridLayersOf = (scope: IRScope): Array<IRScope> =>
  allScopes(scope).filter(child => child.meta?.source === 'plot' && child.meta.layer === 'grid');

describe('scope provenance surface lowering', () => {
  it('mark_layer_meta_carries_coordinate_view', () => {
    const outer = expandOf(parsePlotSpec(overlaySpec));
    expect(markLayersOf(outer).map(layer => layer.meta?.coordinateView)).toEqual(['temp', 'rain']);
    expect(markLayersOf(outer).every(layer => layer.meta?.coordinateScope === undefined)).toBe(true);
  });

  it('facet_datum_meta_carries_facet_context', () => {
    const outer = expandOf(parsePlotSpec(facetSpec));
    const datum = allNodes(outer).find(node => node.meta?.transformedIndex === 0);
    expect(datum?.meta).toMatchObject({
      coordinateView: 'region.panel._.north',
      facet: { id: 'region', column: 'north' },
    });
    expect(datum?.meta?.coordinateScope).toBeUndefined();
  });

  it('track_datum_meta_carries_arrangement_and_track_context', () => {
    const outer = expandOf(parsePlotSpec(trackSpec));
    const datum = allNodes(outer).find(node => node.meta?.markIndex === 1 && node.meta.transformedIndex === 0);
    expect(datum?.meta).toMatchObject({ coordinateView: 'rain', arrangement: 'lanes', track: 'rain' });
    expect(datum?.meta?.scaffold).toBeUndefined();
  });

  it('track_guide_meta_carries_arrangement_and_track_context', () => {
    const outer = expandOf(parsePlotSpec(trackSpec));
    const rainGridLayer = gridLayersOf(outer).find(layer => layer.meta?.coordinateView === 'rain');
    expect(rainGridLayer?.meta).toMatchObject({ coordinateView: 'rain', arrangement: 'lanes', track: 'rain' });
    expect(rainGridLayer?.meta?.scaffold).toBeUndefined();
  });

  it('grid_layer_uses_explicit_guide_owner_id', () => {
    const spec = parsePlotSpec({
      ...overlaySpec,
      guides: overlaySpec.guides.map((guide, index) => ({
        ...guide,
        id: index === 0 ? 'temperature-axis' : 'rainfall-axis',
        grid: true,
      })),
    });
    const ids = gridLayersOf(expandOf(spec)).map(layer => layer.id);
    expect(ids).toEqual(['weather.temperature-axis.grid', 'weather.rainfall-axis.grid']);
  });

  it('anonymous_grid_layer_uses_coordinate_view_owner_id', () => {
    const spec = parsePlotSpec({
      ...overlaySpec,
      guides: overlaySpec.guides.map(guide => ({ ...guide, grid: true })),
    });
    const ids = gridLayersOf(expandOf(spec)).map(layer => layer.id);
    expect(ids).toEqual(['weather.view.temp.grid.y', 'weather.view.rain.grid.y']);
  });
});

describe('scope provenance surface locator', () => {
  it('locator_by_coordinate_view_disambiguates_same_index', () => {
    const locator = createPlotLocator(
      parsePlotSpec(overlaySpec),
      { weather: weatherRows },
      { width: 480, height: 300 },
    );
    const temp = locator.datum(0, { coordinateView: 'temp' });
    const rain = locator.datum(0, { coordinateView: 'rain' });
    expect(temp?.meta.coordinateView).toBe('temp');
    expect(rain?.meta.coordinateView).toBe('rain');
    expect(rain?.position).not.toEqual(temp?.position);
  });

  it('locator_by_facet_key_disambiguates_panel', () => {
    const locator = createPlotLocator(parsePlotSpec(facetSpec), { weather: weatherRows }, { width: 480, height: 300 });
    const north = locator.datum(0, { facet: { id: 'region', column: 'north' } });
    const south = locator.datum(0, { facet: { id: 'region', column: 'south' } });
    expect(north?.meta.facet).toEqual({ id: 'region', column: 'north' });
    expect(south?.meta.facet).toEqual({ id: 'region', column: 'south' });
    expect(south?.position[0]).toBeGreaterThan(north?.position[0] ?? 0);
  });

  it('locator_by_track_returns_track_context', () => {
    const locator = createPlotLocator(parsePlotSpec(trackSpec), { weather: weatherRows }, { width: 480, height: 300 });
    const rain = locator.datum(0, { track: 'rain' });
    expect(rain?.meta).toMatchObject({ coordinateView: 'rain', arrangement: 'lanes', track: 'rain' });
  });

  it('root_and_view_addresses_resolve', () => {
    const locator = createPlotLocator(
      parsePlotSpec(overlaySpec),
      { weather: weatherRows },
      { width: 480, height: 300 },
    );
    expect(locator.resolve('weather.datum.0')?.meta.transformedIndex).toBe(0);
    expect(locator.resolve('weather.view.rain.datum.0')?.meta.coordinateView).toBe('rain');
    expect(locator.resolve('weather.scope.rain.datum.0')).toBeNull();
  });

  it('unknown_view_or_invalid_facet_returns_null', () => {
    const locator = createPlotLocator(parsePlotSpec(facetSpec), { weather: weatherRows }, { width: 480, height: 300 });
    expect(locator.datum(0, { coordinateView: 'missing' })).toBeNull();
    expect(locator.datum(0, { facet: { id: 'region', column: 'west' } })).toBeNull();
  });
});
