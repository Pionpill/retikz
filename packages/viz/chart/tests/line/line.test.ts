import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import type { IRChild, IRPath, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { lowerPlotWithLineage } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { lineChartDefinition } from '../../src/line/line/recipe';
import { LineChartSchema } from '../../src/line/line/schema';

const runtime = resolveChartProviderRegistry([
  { family: 'line', recipe: lineChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const plotOf = (
  properties: Record<string, unknown> = {},
  encodings: Record<string, unknown> = {},
  marks: Array<Record<string, unknown>> = [],
) =>
  resolveSelectedChart(
    LineChartSchema.parse({
      namespace: 'chart',
      type: 'line',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'line',
        encodings: { x: 'x', y: 'y', ...encodings },
        properties,
        marks,
        guides: { axis: false, legend: false },
      },
    }),
    { theme: DEFAULT_RESOLVED_THEME, recipe: lineChartDefinition, chartThemeDefinitions: [], runtime },
  ).plot;

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isPath = (child: IRChild): child is IRPath => child.type === 'path';
const pathsOf = (children: Array<IRChild>): Array<IRPath> =>
  children.flatMap(child => (isScope(child) ? pathsOf(child.children) : isPath(child) ? [child] : []));
const render = (plot: ReturnType<typeof plotOf>, rows: Array<ExternalRow>) =>
  pathsOf(lowerPlotWithLineage(plot, { rows }, { layout: { width: 480, height: 320 }, environment: {} }).children);

describe('Line 序列契约', () => {
  it('point 统一控制显示与样式，空对象开启，false 关闭', () => {
    expect(plotOf({ point: false }).marks.map(mark => mark.type)).toEqual(['path']);
    for (const point of [true, {}]) {
      expect(plotOf({ point }).marks.map(mark => mark.type)).toEqual(['path', 'point']);
    }
    expect(plotOf({ point: { size: 0, fill: '#123456', opacity: 0 } }).marks[1]).toMatchObject({
      type: 'point',
      properties: { size: 0, fill: '#123456', opacity: { overall: 0 } },
    });
    expect(() => plotOf({ showPoints: true })).toThrow();
  });

  it('图元的 point 开关与稀疏样式遵守继承，关闭不意外生成点', () => {
    const properties = { point: { size: 5, fill: '#123456', opacity: { overall: 0.8, fill: 0.4 } } };
    for (const point of [undefined, true, {}]) {
      const marks = plotOf(properties, {}, [{ kind: 'line', override: true, properties: { point } }]).marks;
      expect(marks.map(mark => mark.type)).toEqual(['path', 'point']);
      expect(marks[1]).toMatchObject({ properties: properties.point });
    }
    expect(plotOf(properties, {}, [{ kind: 'line', override: true, properties: { point: false } }]).marks).toHaveLength(
      1,
    );
    expect(
      plotOf(properties, {}, [
        { kind: 'line', override: true, properties: { point: { size: 0, opacity: { fill: 0 } } } },
      ]).marks[1],
    ).toMatchObject({ properties: { size: 0, fill: '#123456', opacity: { overall: 0.8, fill: 0 } } });
    for (const point of [true, {}, { size: 3 }]) {
      expect(
        plotOf({ point: false }, {}, [{ kind: 'line', override: true, properties: { point } }]).marks.map(
          mark => mark.type,
        ),
      ).toEqual(['path', 'point']);
    }
  });
  it('显式类别尺度与分面保持各自序列，不按 domain 重排', () => {
    const encodings = {
      x: { field: 'x', scale: { operation: { type: 'point', name: 'categories', domain: ['C', 'B', 'A'] } } },
      row: 'panel',
    };
    const rows = [
      { x: 'A', y: 1, panel: 'a' },
      { x: 'B', y: 2, panel: 'a' },
      { x: 'C', y: 1, panel: 'a' },
      { x: 'A', y: 2, panel: 'b' },
      { x: 'C', y: 3, panel: 'b' },
    ];
    const plot = plotOf({}, encodings);
    expect(plot.composition).toBeDefined();
    const paths = render(plot, rows);
    expect(paths).toHaveLength(2);
    expect(paths.map(path => path.children.length).sort()).toEqual([2, 3]);
  });

  it('时间尺度与坐标替换继续走 Plot 主链', () => {
    const plot = plotOf({}, { x: { field: 'x', scale: { operation: { type: 'time', name: 'time' } } } });
    expect(
      render(plot, [
        { x: '2026-01-01', y: 1 },
        { x: '2026-02-01', y: 2 },
      ]),
    ).toHaveLength(1);
    const source = LineChartSchema.parse({
      namespace: 'chart',
      type: 'line',
      data: { reference: 'rows' },
      coordinate: { type: 'polar2D' },
      recipe: { chartType: 'line', encodings: { x: 'x', y: 'y' }, guides: { axis: false, legend: false } },
    });
    const polar = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: lineChartDefinition,
      chartThemeDefinitions: [],
      runtime,
    }).plot;
    expect(polar.coordinate?.type).toBe('polar2D');
    expect(
      render(polar, [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 1 },
      ]),
    ).toHaveLength(1);
  });

  it('显式系列尺度与路径常量控制图例线符号，主题默认仍传给 Plot', () => {
    const source = LineChartSchema.parse({
      namespace: 'chart',
      type: 'line',
      data: { reference: 'rows' },
      plotExtension: { defaultPlot: { palette: { categorical: ['#112233', '#445566'] } } },
      recipe: {
        chartType: 'line',
        encodings: {
          x: 'x',
          y: 'y',
          series: { field: 's', scale: { operation: { type: 'ordinal', name: 'series-colors' } } },
        },
        properties: { path: { stroke: '#ff0000' } },
      },
    });
    const plot = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: lineChartDefinition,
      chartThemeDefinitions: [],
      runtime,
    }).plot;
    expect(plot.defaultPlot?.palette?.categorical).toEqual(['#112233', '#445566']);
    expect(plot.guides?.find(guide => guide.type === 'legend')).toMatchObject({
      scale: 'series-colors',
      symbols: [{ kind: 'line', paint: '#ff0000' }],
    });
    expect(
      render(plot, [
        { x: 0, y: 1, s: 'a' },
        { x: 1, y: 2, s: 'a' },
      ]).length,
    ).toBeGreaterThan(0);
  });
  it('默认只绘制开放路径，显示点时组合 Point，override 替换整个组', () => {
    expect(plotOf().marks).toHaveLength(1);
    expect(plotOf().marks[0]).toMatchObject({ type: 'path', properties: { closed: false, strokeWidth: 2 } });
    expect(plotOf({ point: true }).marks.map(mark => mark.type)).toEqual(['path', 'point']);
    const plot = plotOf({ point: true, path: { strokeWidth: 4, stroke: '#ff0000' } }, {}, [
      { kind: 'line', override: true, properties: { point: false, path: { opacity: 0 } } },
    ]);
    expect(plot.marks).toHaveLength(1);
    expect(plot.marks[0]).toMatchObject({ properties: { strokeWidth: 4, stroke: '#ff0000', opacity: { overall: 0 } } });
    expect(
      plotOf({ point: true, path: { strokeWidth: 4 } }, {}, [
        { kind: 'line', override: true, properties: { path: { curve: 'step' } } },
      ]).marks,
    ).toHaveLength(2);
  });

  it('默认保留行顺序，显式 order 才排序，重复位置不消失', () => {
    const rows = [
      { x: 2, y: 3, n: 2 },
      { x: 0, y: 1, n: 0 },
      { x: 2, y: 2, n: 1 },
    ];
    const original = render(plotOf(), rows);
    const ordered = render(plotOf({}, { order: 'n' }), rows);
    expect(original).toHaveLength(1);
    expect(original[0].children).toHaveLength(3);
    expect(ordered[0].children).toHaveLength(3);
    expect(ordered[0].children).not.toEqual(original[0].children);
    expect(render(plotOf(), [...rows].reverse())[0].children).not.toEqual(original[0].children);
  });

  it('相同颜色不合并系列，缺值桥接不跨系列', () => {
    const rows = [
      { x: 0, y: 1, s: 'a' },
      { x: 1, y: null, s: 'a' },
      { x: 2, y: 3, s: 'a' },
      { x: 0, y: 3, s: 'b' },
      { x: 2, y: 1, s: 'b' },
    ];
    const paths = render(plotOf({ path: { stroke: '#ff0000', connectNulls: true } }, { series: 's' }), rows);
    expect(paths).toHaveLength(2);
    expect(paths.filter(path => path.style?.dashPattern !== undefined)).toHaveLength(1);
    expect(render(plotOf({ path: { stroke: '#ff0000' } }, { series: 's' }), rows)).toHaveLength(1);
  });

  it('曲线与阶梯使用原生 Path 几何，空序列和单点不伪造线段', () => {
    const rows = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
    ];
    const linear = render(plotOf(), rows);
    expect(render(plotOf({ path: { curve: 'step' } }), rows)[0].children).not.toEqual(linear[0].children);
    expect(JSON.stringify(render(plotOf({ path: { curve: 'catmullRom' } }), rows))).toContain('smooth');
    expect(render(plotOf(), [])).toHaveLength(0);
    expect(render(plotOf(), [rows[0]])).toHaveLength(0);
  });
});
