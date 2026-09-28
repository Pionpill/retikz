import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import type { IRChild, IRPath, IRScope } from '@retikz/core';
import { lowerPlotWithLineage } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { ConnectedScatterChartSchema } from '../../src/point/connected-scatter';
import { ConnectedScatterChartDefinition } from '../../src/point/connected-scatter/recipe';

const runtime = resolveChartProviderRegistry([
  { family: 'point', recipe: ConnectedScatterChartDefinition, themeDefinitions: [] },
]).runtime;
const plotOf = (path: Record<string, unknown> = {}, marks: Array<Record<string, unknown>> = []) => {
  const source = ConnectedScatterChartSchema.parse({
    namespace: 'chart',
    type: 'point',
    data: { reference: 'rows' },
    recipe: {
      chartType: 'connected-scatter',
      encodings: { x: 'x', y: 'y', order: 'order' },
      properties: { path },
      marks,
      guides: { axis: false, grid: false, legend: false },
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
const isPath = (child: IRChild): child is IRPath => child.type === 'path';
const pathsOf = (children: Array<IRChild>): Array<IRPath> =>
  children.flatMap(child => (isScope(child) ? pathsOf(child.children) : isPath(child) ? [child] : []));

describe('Connected Scatter connection curves', () => {
  it('仅为排序后各序列内部的缺口生成独立描边，保留曲线与观测点', () => {
    const plot = plotOf({ curve: 'catmullRom', connectNulls: { stroke: '#ff0000', strokeWidth: 4 } });
    const path = plot.marks[0];
    if (path.type !== 'path') throw new Error('Expected path mark');
    path.series = 'group';
    const datasets = {
      rows: [
        { x: 3, y: 2, order: 3, group: 'a' },
        { x: 1, y: 1, order: 1, group: 'a' },
        { x: 2, y: null, order: 2, group: 'a' },
        { x: 0, y: 0, order: 0, group: 'a' },
        { x: 4, y: 3, order: 4, group: 'a' },
        { x: 1, y: 4, order: 1, group: 'b' },
        { x: 0, y: 3, order: 0, group: 'b' },
      ],
    };
    const paths = pathsOf(lowerPlotWithLineage(plot, datasets, { width: 480, height: 320 }).children);
    const bridges = paths.filter(item => item.style?.dashPattern !== undefined);
    expect(paths).toHaveLength(4);
    expect(bridges).toHaveLength(1);
    expect(bridges[0].style).toMatchObject({ stroke: '#ff0000', strokeWidth: 4, dashPattern: [6, 4] });
    expect(
      paths.filter(item => item !== bridges[0]).every(item => item.children.some(step => step.kind === 'smooth')),
    ).toBe(true);
    expect(plot.marks[1]).toEqual(plotOf().marks[1]);
  });
  it('preserves the linear default and inherits or overrides the recipe curve', () => {
    expect(plotOf().marks[0]).not.toHaveProperty('curve');
    expect(plotOf({ curve: 'catmullRom' }, [{ kind: 'connected-scatter', override: true }]).marks[0]).toMatchObject({
      type: 'path',
      curve: 'catmullRom',
    });
    expect(
      plotOf({ curve: 'catmullRom' }, [
        {
          kind: 'connected-scatter',
          override: true,
          properties: { path: { curve: 'step' } },
        },
      ]).marks[0],
    ).toMatchObject({ type: 'path', curve: 'step' });
    expect(() => plotOf({ curve: 'unsupported' })).toThrow();
  });

  it('changes path geometry while keeping point marks and ordering intact', () => {
    const linear = plotOf();
    const smooth = plotOf({ curve: 'catmullRom' });
    expect(smooth.marks[1]).toEqual(linear.marks[1]);
    const datasets = {
      rows: [
        { x: 0, y: 0, order: 0 },
        { x: 1, y: 2, order: 1 },
        { x: 2, y: 1, order: 2 },
      ],
    };
    const render = (plot: typeof linear) =>
      pathsOf(lowerPlotWithLineage(plot, datasets, { width: 480, height: 320 }).children);
    expect(render(smooth)).not.toEqual(render(linear));
    expect(JSON.stringify(render(smooth))).toContain('"kind":"smooth"');
  });
});
