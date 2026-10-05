import type { IRChild, IRNode, IRPath, IRScope, IRNodeDefault, IRPathDefault } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { lowerPlotWithLineage } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { ConnectedScatterChartDefinition } from '../../src/point/connected-scatter/recipe';
import { ConnectedScatterChartSchema } from '../../src/point/connected-scatter/schema';

const runtime = resolveChartProviderRegistry([
  { family: 'point', recipe: ConnectedScatterChartDefinition, themeDefinitions: [] },
]).runtime;

const palette = ['#ff0000', '#00ff00', '#0000ff'];

const rows = ['A', 'B', 'C', 'D'].flatMap(series => [
  { x: 0, y: 0, order: 0, series },
  { x: 1, y: 1, order: 1, series },
]);

const chartOf = (properties: Record<string, unknown> = {}, series = true, extras: Record<string, unknown> = {}) => {
  const source = ConnectedScatterChartSchema.parse({
    namespace: 'chart',
    type: 'point',
    data: { reference: 'rows' },
    recipe: {
      chartType: 'connected-scatter',
      encodings: {
        x: 'x',
        y: 'y',
        order: 'order',
        ...(series
          ? { series: { field: 'series', scale: { operation: { type: 'ordinal', name: 'series', range: palette } } } }
          : {}),
      },
      properties,
      ...extras,
    },
  });

  expect(ConnectedScatterChartSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);

  return resolveSelectedChart(source, {
    theme: DEFAULT_RESOLVED_THEME,
    recipe: ConnectedScatterChartDefinition,
    themeDefinitions: [],
    runtime,
  }).plot;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const isPath = (child: IRChild): child is IRPath => child.type === 'path';

const materialize = (children: Array<IRChild>, node: IRNodeDefault = {}, path: IRPathDefault = {}): Array<IRChild> =>
  children.map(child => {
    if (isScope(child))
      return {
        ...child,
        children: materialize(
          child.children,
          { ...node, ...child.defaults?.node, style: { ...node.style, ...child.defaults?.node?.style } },
          { ...path, ...child.defaults?.path, style: { ...path.style, ...child.defaults?.path?.style } },
        ),
      };

    if (isNode(child)) return { ...node, ...child, style: { ...node.style, ...child.style } };
    if (isPath(child)) return { ...path, ...child, style: { ...path.style, ...child.style } };

    return child;
  });

const descendants = (children: Array<IRChild>): Array<IRChild> =>
  children.flatMap(child => (isScope(child) ? [child, ...descendants(child.children)] : [child]));

const render = (properties: Record<string, unknown> = {}, series = true, extras: Record<string, unknown> = {}) => {
  const plot = chartOf(properties, series, extras);
  const all = descendants(
    materialize(
      lowerPlotWithLineage(
        { ...plot, plotDefaults: { ...plot.plotDefaults, palette: { categorical: palette, series: palette } } },
        { rows },
        { width: 480, height: 320 },
      ).children,
    ),
  );
  const legend = all.filter(isScope).filter(child => child.id?.includes('legend') === true);
  const symbols = legend
    .flatMap(scope => descendants(scope.children))
    .filter(isNode)
    .filter(child => child.text === undefined);
  const points = all.filter(isNode).filter(child => child.shape === 'circle' && !symbols.includes(child));
  const paths = all
    .filter(isPath)
    .filter(child => child.style?.stroke !== undefined && palette.includes(String(child.style.stroke)));

  return { plot, points, paths, symbols };
};
describe('Connected Scatter palette allocation', () => {
  it('cycles adjacent point/path colors across an odd palette and matches composite legends', () => {
    const result = render({ colorMode: 'mark' });

    expect(result.points.map(point => point.style?.fill).sort()).toEqual(
      [palette[0], palette[0], palette[2], palette[2], palette[1], palette[1], palette[0], palette[0]].sort(),
    );
    expect(result.paths.map(path => path.style?.stroke)).toEqual([palette[1], palette[0], palette[2], palette[1]]);
    expect(result.symbols.map(symbol => symbol.style?.fill)).toEqual([
      palette[1],
      palette[0],
      palette[0],
      palette[2],
      palette[2],
      palette[1],
      palette[1],
      palette[0],
    ]);
  });

  it('retains the series default and explicit series equivalence', () => {
    expect(chartOf()).toEqual(chartOf({ colorMode: 'series' }));

    const result = render();

    expect(result.points.map(point => point.style?.fill).sort()).toEqual(
      palette
        .concat(palette[0])
        .flatMap(color => [color, color])
        .sort(),
    );
    expect(result.paths.map(path => path.style?.stroke)).toEqual(palette.concat(palette[0]));
  });

  it.each([
    { point: { color: '#112233' }, path: { stroke: '#445566' } },
    { point: { color: '#ffffff', fill: '#112233' }, path: { stroke: '#445566' } },
  ])('preserves explicit paints in marks and legends: %j', properties => {
    const result = render({ colorMode: 'mark', ...properties });

    expect(result.points).toHaveLength(8);
    expect(result.points.every(point => point.style?.fill === '#112233')).toBe(true);
    expect(result.symbols.map(symbol => symbol.style?.fill)).toEqual(
      Array.from({ length: 4 }, () => ['#445566', '#112233']).flat(),
    );
  });

  it('uses the first two colors without series and honors hidden legends', () => {
    const result = render({ colorMode: 'mark' }, false);

    expect(result.points.every(point => point.style?.fill === palette[0])).toBe(true);
    expect(result.paths.map(path => path.style?.stroke)).toEqual([palette[1]]);
    expect(result.symbols).toEqual([]);
    expect(render({ colorMode: 'mark' }, true, { guides: { legend: false } }).symbols).toEqual([]);
  });

  it.each([true, false])('inherits color mode in authored marks with override=%s', override => {
    const result = render({ colorMode: 'mark' }, true, {
      marks: [{ kind: 'connected-scatter', override, properties: { point: { fill: '#112233' } } }],
    });

    expect(result.plot.marks).toHaveLength(override ? 2 : 4);
    expect(result.symbols.some(symbol => symbol.style?.fill === '#112233')).toBe(true);
  });
});

it('keeps mark colors available in series facets', () => {
  const result = render({ colorMode: 'mark' }, true, {
    encodings: { x: 'x', y: 'y', order: 'order', series: 'series', row: 'series' },
  });

  expect(result.points).toHaveLength(rows.length);
  expect(result.points.map(point => point.style?.fill)).toContain(palette[0]);
  expect(result.paths.length).toBeGreaterThan(0);
});

it.each([true, false])('muted keeps point appearance and lowers path opacity with series=%s', series => {
  const baseline = render({ point: { opacity: 0.8 } }, series);
  const muted = render({ colorMode: 'muted', point: { opacity: 0.8 } }, series);

  expect(muted.points).toEqual(baseline.points);
  expect(muted.paths.length).toBeGreaterThan(0);
  expect(muted.paths.map(path => path.style?.stroke)).toEqual(baseline.paths.map(path => path.style?.stroke));
  expect(muted.paths.every(path => path.style?.strokeOpacity === 0.6)).toBe(true);
});
it.each([0, 0.35, 1])('explicit path opacity %s wins over muted default', strokeOpacity => {
  const result = render({ colorMode: 'muted', path: { strokeOpacity } });

  expect(result.paths).toHaveLength(4);
  expect(result.paths.every(path => path.style?.strokeOpacity === strokeOpacity)).toBe(true);
});
it('authored mark inherits muted opacity and can override it', () => {
  const inherited = render({ colorMode: 'muted' }, true, { marks: [{ kind: 'connected-scatter', override: true }] });

  expect(inherited.paths.every(path => path.style?.strokeOpacity === 0.6)).toBe(true);

  const explicit = render({ colorMode: 'muted' }, true, {
    marks: [{ kind: 'connected-scatter', override: true, properties: { path: { strokeOpacity: 0.9 } } }],
  });

  expect(explicit.paths.every(path => path.style?.strokeOpacity === 0.9)).toBe(true);
});
