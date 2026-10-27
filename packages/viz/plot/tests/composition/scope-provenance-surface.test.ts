import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createPlotLocator } from '../../src';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import type { IRPlot } from '../../src/schemas';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

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
    { type: 'point', encodings: { position: { x: { field: 'day' }, y: { field: 'temperature' } } } },
    {
      type: 'point',
      coordinateView: 'rain',
      encodings: { position: { x: { field: 'day' }, y: { field: 'rainfall' } } },
    },
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
  marks: [{ type: 'point', encodings: { position: { x: { field: 'day' }, y: { field: 'temperature' } } } }],
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
    {
      type: 'point',
      coordinateView: 'temp',
      encodings: { position: { x: { field: 'day' }, y: { field: 'temperature' } } },
    },
    {
      type: 'point',
      coordinateView: 'rain',
      encodings: { position: { x: { field: 'day' }, y: { field: 'rainfall' } } },
    },
  ],
  guides: [{ type: 'axis', dimension: 'x', coordinateView: 'rain', grid: true }],
};

const parsePlotIR = (spec: unknown): IRPlot => PlotSchema.parse(spec);

const expandOf = (spec: IRPlot): IRScope => {
  return lowerPlotWithDataArtifact(
    spec,
    { weather: weatherRows },
    { layout: { width: 480, height: 300 }, textMeasurer: measureLabel, provenance: true, datumProvenance: true },
  ).child as IRScope;
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

describe('范围来源地表下沉', () => {
  it('标记层元数据包含坐标视图', () => {
    const outer = expandOf(parsePlotIR(overlaySpec));

    expect(markLayersOf(outer).map(layer => layer.meta?.coordinateView)).toEqual(['temp', 'rain']);
    expect(markLayersOf(outer).every(layer => layer.meta?.coordinateScope === undefined)).toBe(true);
  });

  it('刻面数据元携带刻面上下文', () => {
    const outer = expandOf(parsePlotIR(facetSpec));
    const datum = allNodes(outer).find(node => node.meta?.transformedIndex === 0);

    expect(datum?.meta).toMatchObject({
      coordinateView: 'region.panel._.north',
      facet: { id: 'region', column: 'north' },
    });
    expect(datum?.meta?.coordinateScope).toBeUndefined();
  });

  it('轨道数据元携带排列和轨道上下文', () => {
    const outer = expandOf(parsePlotIR(trackSpec));
    const datum = allNodes(outer).find(node => node.meta?.markIndex === 1 && node.meta.transformedIndex === 0);

    expect(datum?.meta).toMatchObject({ coordinateView: 'rain', arrangement: 'lanes', track: 'rain' });
    expect(datum?.meta?.scaffold).toBeUndefined();
  });

  it('轨道辅助线元承载排列和轨道上下文', () => {
    const outer = expandOf(parsePlotIR(trackSpec));
    const rainGridLayer = gridLayersOf(outer).find(layer => layer.meta?.coordinateView === 'rain');

    expect(rainGridLayer?.meta).toMatchObject({ coordinateView: 'rain', arrangement: 'lanes', track: 'rain' });
    expect(rainGridLayer?.meta?.scaffold).toBeUndefined();
  });

  it('网格层使用显式辅助线所属模块 ID', () => {
    const spec = parsePlotIR({
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

  it('匿名网格层使用所属坐标视图的 id', () => {
    const spec = parsePlotIR({
      ...overlaySpec,
      guides: overlaySpec.guides.map(guide => ({ ...guide, grid: true })),
    });
    const ids = gridLayersOf(expandOf(spec)).map(layer => layer.id);

    expect(ids).toEqual(['weather.view.temp.grid.y', 'weather.view.rain.grid.y']);
  });
});

describe('范围来源表面定位器', () => {
  it('定位器按坐标视图区分相同索引', () => {
    const locator = createPlotLocator(
      parsePlotIR(overlaySpec),
      { weather: weatherRows },
      { layout: { width: 480, height: 300 }, environment: {} },
    );
    const temp = locator.datum(0, { coordinateView: 'temp' });
    const rain = locator.datum(0, { coordinateView: 'rain' });

    expect(temp?.meta.coordinateView).toBe('temp');
    expect(rain?.meta.coordinateView).toBe('rain');
    expect(rain?.position).not.toEqual(temp?.position);
  });

  it('通过侧面键定位器消除面板歧义', () => {
    const locator = createPlotLocator(
      parsePlotIR(facetSpec),
      { weather: weatherRows },
      { layout: { width: 480, height: 300 }, environment: {} },
    );
    const north = locator.datum(0, { facet: { id: 'region', column: 'north' } });
    const south = locator.datum(0, { facet: { id: 'region', column: 'south' } });

    expect(north?.meta.facet).toEqual({ id: 'region', column: 'north' });
    expect(south?.meta.facet).toEqual({ id: 'region', column: 'south' });
    expect(south?.position[0]).toBeGreaterThan(north?.position[0] ?? 0);
  });

  it('轨道定位器返回轨道上下文', () => {
    const locator = createPlotLocator(
      parsePlotIR(trackSpec),
      { weather: weatherRows },
      { layout: { width: 480, height: 300 }, environment: {} },
    );
    const rain = locator.datum(0, { track: 'rain' });

    expect(rain?.meta).toMatchObject({ coordinateView: 'rain', arrangement: 'lanes', track: 'rain' });
  });

  it('根地址和视图地址解析', () => {
    const locator = createPlotLocator(
      parsePlotIR(overlaySpec),
      { weather: weatherRows },
      { layout: { width: 480, height: 300 }, environment: {} },
    );

    expect(locator.resolve('weather.datum.0')?.meta.transformedIndex).toBe(0);
    expect(locator.resolve('weather.view.rain.datum.0')?.meta.coordinateView).toBe('rain');
    expect(locator.resolve('weather.scope.rain.datum.0')).toBeNull();
  });

  it('未知视图或无效面返回空', () => {
    const locator = createPlotLocator(
      parsePlotIR(facetSpec),
      { weather: weatherRows },
      { layout: { width: 480, height: 300 }, environment: {} },
    );

    expect(locator.datum(0, { coordinateView: 'missing' })).toBeNull();
    expect(locator.datum(0, { facet: { id: 'region', column: 'west' } })).toBeNull();
  });
});
