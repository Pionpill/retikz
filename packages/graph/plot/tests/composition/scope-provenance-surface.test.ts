import type { IRChild, IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { PlotSpec } from '../../src/schemas';

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
    defaultScope: 'temp',
    scopes: [
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
    { type: 'point', coordinateScope: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' } },
    { type: 'axis', dimension: 'y', coordinateScope: 'rain', placement: { kind: 'side', side: 'right' } },
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
    defaultScope: 'root',
    scopes: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' } }],
    facets: [{ id: 'region', column: { field: 'region', order: ['north', 'south'] } }],
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
    defaultScope: 'temp',
    scaffolds: [
      {
        id: 'lanes',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yValue' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'temp', band: { role: 'y', start: 0, end: 0.45 } },
          { id: 'rain', band: { role: 'y', start: 0.55, end: 1 } },
        ],
      },
    ],
    scopes: [
      { id: 'temp', placement: { kind: 'track', scaffold: 'lanes', track: 'temp' } },
      { id: 'rain', placement: { kind: 'track', scaffold: 'lanes', track: 'rain' } },
    ],
  },
  marks: [
    { type: 'point', coordinateScope: 'temp', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'point', coordinateScope: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [{ type: 'axis', dimension: 'x', coordinateScope: 'rain', grid: true }],
};

const expandOf = (spec: PlotSpec): IRScope => {
  const [definition] = lowerPlots({ weather: weatherRows }, { width: 480, height: 300, provenance: true, datumProvenance: true });
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
  it('mark_layer_meta_carries_coordinate_scope', () => {
    const outer = expandOf(PlotSpecSchema.parse(overlaySpec));
    expect(markLayersOf(outer).map(layer => layer.meta?.coordinateScope)).toEqual(['temp', 'rain']);
  });

  it('facet_datum_meta_carries_facet_context', () => {
    const outer = expandOf(PlotSpecSchema.parse(facetSpec));
    const datum = allNodes(outer).find(node => node.meta?.transformedIndex === 0);
    expect(datum?.meta).toMatchObject({
      coordinateScope: 'facet.region.column.north',
      facet: { id: 'region', column: 'north' },
    });
  });

  it('track_datum_meta_carries_scaffold_and_track_context', () => {
    const outer = expandOf(PlotSpecSchema.parse(trackSpec));
    const datum = allNodes(outer).find(node => node.meta?.markIndex === 1 && node.meta.transformedIndex === 0);
    expect(datum?.meta).toMatchObject({ coordinateScope: 'rain', scaffold: 'lanes', track: 'rain' });
  });

  it('track_guide_meta_carries_scaffold_and_track_context', () => {
    const outer = expandOf(PlotSpecSchema.parse(trackSpec));
    expect(gridLayersOf(outer)[0]?.meta).toMatchObject({ coordinateScope: 'rain', scaffold: 'lanes', track: 'rain' });
  });
});

describe('scope provenance surface locator', () => {
  it('locator_by_coordinate_scope_disambiguates_same_index', () => {
    const locator = createPlotLocator(PlotSpecSchema.parse(overlaySpec), { weather: weatherRows }, { width: 480, height: 300 });
    const temp = locator.datum(0, { coordinateScope: 'temp' });
    const rain = locator.datum(0, { coordinateScope: 'rain' });
    expect(temp?.meta.coordinateScope).toBe('temp');
    expect(rain?.meta.coordinateScope).toBe('rain');
    expect(rain?.position).not.toEqual(temp?.position);
  });

  it('locator_by_facet_key_disambiguates_panel', () => {
    const locator = createPlotLocator(PlotSpecSchema.parse(facetSpec), { weather: weatherRows }, { width: 480, height: 300 });
    const north = locator.datum(0, { facet: { id: 'region', column: 'north' } });
    const south = locator.datum(0, { facet: { id: 'region', column: 'south' } });
    expect(north?.meta.facet).toEqual({ id: 'region', column: 'north' });
    expect(south?.meta.facet).toEqual({ id: 'region', column: 'south' });
    expect(south?.position[0]).toBeGreaterThan(north?.position[0] ?? 0);
  });

  it('locator_by_track_returns_track_context', () => {
    const locator = createPlotLocator(PlotSpecSchema.parse(trackSpec), { weather: weatherRows }, { width: 480, height: 300 });
    const rain = locator.datum(0, { track: 'rain' });
    expect(rain?.meta).toMatchObject({ coordinateScope: 'rain', scaffold: 'lanes', track: 'rain' });
  });

  it('legacy_and_extended_addresses_resolve', () => {
    const locator = createPlotLocator(PlotSpecSchema.parse(overlaySpec), { weather: weatherRows }, { width: 480, height: 300 });
    expect(locator.resolve('weather.datum.0')?.meta.transformedIndex).toBe(0);
    expect(locator.resolve('weather.scope.rain.datum.0')?.meta.coordinateScope).toBe('rain');
  });

  it('unknown_scope_or_invalid_facet_returns_null', () => {
    const locator = createPlotLocator(PlotSpecSchema.parse(facetSpec), { weather: weatherRows }, { width: 480, height: 300 });
    expect(locator.datum(0, { coordinateScope: 'missing' })).toBeNull();
    expect(locator.datum(0, { facet: { id: 'region', column: 'west' } })).toBeNull();
  });
});
