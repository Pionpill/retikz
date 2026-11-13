import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { lowerPlotWithLineage } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { slopeChartDefinition } from '../../src/line/slope/recipe';
import { SlopeChartSchema } from '../../src/line/slope/schema';

const runtime = resolveChartProviderRegistry([
  { family: 'line', recipe: slopeChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const plotOf = (
  properties: Record<string, unknown> = {},
  encodings: Record<string, unknown> = {},
  marks: Array<Record<string, unknown>> = [],
) =>
  resolveSelectedChart(
    SlopeChartSchema.parse({
      namespace: 'chart',
      type: 'line',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'slope',
        encodings: { entity: 'name', start: 'before', end: 'after', ...encodings },
        properties,
        marks,
        guides: { axis: false },
      },
    }),
    { theme: DEFAULT_RESOLVED_THEME, recipe: slopeChartDefinition, chartThemeDefinitions: [], runtime },
  ).plot;

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const flatten = (children: Array<IRChild>): Array<IRChild> =>
  children.flatMap(child => (isScope(child) ? flatten(child.children) : [child]));
const render = (plot: ReturnType<typeof plotOf>, rows: Array<ExternalRow>) => {
  const children = flatten(
    lowerPlotWithLineage(plot, { rows }, { layout: { width: 480, height: 320 }, environment: {} }).children,
  );
  return {
    paths: children.filter((child): child is IRPath => child.type === 'path'),
    nodes: children.filter((child): child is IRNode => child.type === 'node'),
  };
};

describe('Slope 两阶段配对', () => {
  it('每行独立连接，同名同色不串线，两端共用数值尺度', () => {
    const rows = [
      { name: 'A', before: 10, after: 30 },
      { name: 'A', before: 30, after: 10 },
    ];
    const result = render(plotOf({ path: { stroke: '#123456' }, label: false }), rows);
    expect(result.paths).toHaveLength(2);
    expect(result.nodes).toHaveLength(4);
    expect(result.paths.every(path => path.children.length === 2)).toBe(true);
    expect(render(plotOf({ label: false }), [...rows].reverse()).paths.map(path => path.children)).toEqual(
      result.paths.map(path => path.children).reverse(),
    );
  });

  it('缺失端点不连线也不补零，有效端点保留标签，空数据无图元', () => {
    const plot = plotOf();
    const result = render(plot, [
      { name: 'A', before: null, after: 30 },
      { name: 'B', before: 20, after: null },
    ]);
    expect(result.paths).toHaveLength(0);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.every(node => node.label !== undefined)).toBe(true);
    expect(render(plot, []).paths).toHaveLength(0);
  });

  it('点与单个实体标签独立开关，方向覆盖和显式零生效', () => {
    const rows = [{ name: 'A', before: 10, after: 20 }];
    const hidden = render(plotOf({ point: false, label: false }), rows);
    expect(hidden.nodes).toHaveLength(0);
    const labels = render(plotOf({ point: false, label: { position: 'top', distance: 0 } }), rows);
    expect(labels.nodes).toHaveLength(2);
    for (const node of labels.nodes) {
      const nodeLabels = Array.isArray(node.label) ? node.label : [node.label];
      expect(nodeLabels).toHaveLength(1);
      expect(nodeLabels[0]).toMatchObject({ text: 'A' });
    }
    expect(JSON.stringify(labels.nodes)).toContain('A');
    expect(
      plotOf({ label: { position: 'top', distance: 0 } })
        .marks.slice(1)
        .map(mark => mark.properties?.label),
    ).toEqual([
      { position: 'top', distance: 0 },
      { position: 'top', distance: 0 },
    ]);
    expect(
      plotOf()
        .marks.slice(1)
        .map(mark => mark.properties?.label),
    ).toEqual([{ position: 'left' }, { position: 'right' }]);
    expect(plotOf({ point: { size: 0, opacity: 0 }, path: { strokeWidth: 0 } }).marks[0]).toMatchObject({
      properties: { strokeWidth: 0 },
    });
  });

  it('标签 Source 仅允许单个实体样式，并保留内部标签不可带引线的约束', () => {
    for (const label of [
      { name: true },
      { value: true },
      { text: 'override' },
      [{ position: 'top' }],
      { placement: 'inside', pin: true },
    ]) {
      expect(() => plotOf({ label })).toThrow();
    }
    expect(plotOf({ label: { placement: 'outside', pin: true, position: 0, distance: 0 } }).marks[1]).toMatchObject({
      encodings: { label: 'name' },
      properties: { label: { placement: 'outside', pin: true, position: 0, distance: 0 } },
    });
  });

  it('默认数值尺度为端点标签保留上下空间，显式尺度可以关闭留白', () => {
    expect(plotOf().scales.find(scale => scale.name === '__chart.slope.scale.y')).toMatchObject({
      domainPadding: 32,
    });
    const explicit = plotOf(
      {},
      {
        start: { field: 'before', scale: { operation: { type: 'linear', name: 'custom', domainPadding: 0 } } },
        end: { field: 'after', scale: { reference: 'custom' } },
      },
    );
    expect(explicit.scales.find(scale => scale.name === 'custom')).toMatchObject({ domainPadding: 0 });
    expect(explicit.scales.some(scale => scale.name === '__chart.slope.scale.y')).toBe(false);
  });

  it('阶段命名与共同尺度校验拒绝含混契约', () => {
    expect(() => plotOf({ stages: ['same', 'same'] })).toThrow();
    expect(() => plotOf({}, { start: 'before', end: 'before' })).toThrow();
    expect(() => plotOf({}, { facet: {} })).toThrow();
    expect(() =>
      plotOf(
        {},
        {
          start: { field: 'before', scale: { reference: 'one' } },
          end: { field: 'after', scale: { reference: 'two' } },
        },
      ),
    ).toThrow();
    const plot = plotOf(
      { stages: ['Earlier', 'Later'] },
      {
        start: { field: 'before', scale: { operation: { type: 'linear', name: 'shared', domain: [0, 100] } } },
        end: { field: 'after', scale: { reference: 'shared' } },
      },
    );
    expect(plot.coordinate).toMatchObject({ y: 'shared' });
    expect(plot.scales.find(scale => scale.name === '__chart.slope.scale.x')).toMatchObject({
      domain: ['Earlier', 'Later'],
    });
  });

  it('override 替换整个组并按字段继承点与标签样式', () => {
    const plot = plotOf(
      {
        point: { size: 6, fill: '#123456' },
        label: { position: 'bottom', font: { size: 12 }, distance: 8 },
        path: { strokeWidth: 4 },
      },
      {},
      [{ kind: 'slope', override: true, properties: { point: true, label: true, path: { opacity: 0 } } }],
    );
    expect(plot.marks).toHaveLength(3);
    expect(plot.marks[0]).toMatchObject({ properties: { strokeWidth: 4, opacity: { overall: 0 } } });
    expect(plot.marks[1]).toMatchObject({ properties: { size: 6, fill: '#123456' } });
    expect(plot.marks[1].properties?.label).toMatchObject({ position: 'bottom', distance: 8, font: { size: 12 } });
  });

  it('分面不混合不同面板中的实体', () => {
    const plot = plotOf({ label: false }, { row: 'panel' });
    expect(plot.composition).toBeDefined();
    expect(
      render(plot, [
        { name: 'A', before: 10, after: 20, panel: 'a' },
        { name: 'A', before: 20, after: 10, panel: 'b' },
      ]).paths,
    ).toHaveLength(2);
  });
});
