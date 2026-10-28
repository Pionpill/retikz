import type { ScenePrimitive } from '@retikz/core';
import { compileToScene, DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlots, PlotSchema, resolvePlotTheme } from '../../src';

const rows = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
];

const basePlot = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    { contributeToDomain: true, type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } },
  ],
  ...overrides,
});

const compilePlot = (source: unknown) => {
  const plot = PlotSchema.parse(source);
  return compileToScene(
    { version: 1, type: 'scene', children: [plot] },
    { composites: lowerPlots({ rows }), padding: 0 },
  ).scene;
};

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrimitives(primitive.children)] : [primitive],
  );

describe('Plot Source 默认值和规则', () => {
  it('接受 Source 形状的 defaultPlot 并订购 plotRules，带 JSON 安全往返', () => {
    const source = basePlot({
      defaultPlot: {
        plotArea: { fill: '#f8fafc', border: { stroke: '#334155', strokeWidth: 1.5, drawOpacity: 0.8 } },
        typography: { font: { family: 'Source Serif 4', size: 14 }, textColor: '#334155' },
        axis: {
          line: { stroke: '#475569', strokeWidth: 0 },
          ticks: { mark: false },
          tickLabels: false,
          title: false,
          grid: false,
        },
        legend: { swatchSize: 12, label: { font: { size: 11 } } },
        palette: {
          categorical: ['#2563eb', '#f97316'],
          series: ['#0f766e'],
          sequential: 'viridis',
          diverging: 'rdbu',
          shape: ['circle'],
        },
      },
      plotRules: [
        { select: { dimension: ['x', 'y'] }, axis: { line: false } },
        { select: { dimension: 'x' }, axis: { grid: false } },
      ],
    });

    const parsed = PlotSchema.parse(source);

    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
  });

  it('拒绝无效的绘图区域边框字段', () => {
    for (const border of [{ strokeWidth: -1 }, { drawOpacity: 2 }, { unknown: true }]) {
      const result = PlotSchema.safeParse(basePlot({ defaultPlot: { plotArea: { border } } }));

      expect(result.success).toBe(false);

      if (!result.success)
        expect(result.error.issues.some(issue => issue.path.join('.').startsWith('defaultPlot.plotArea.border'))).toBe(
          true,
        );
    }
  });

  it('拒绝删除的令牌和本机主题根', () => {
    const legacyFields: ReadonlyArray<readonly [string, unknown]> = [
      ['plotThemeTokens', {}],
      ['plotThemeTokenRules', []],
      ['plotTheme', {}],
    ];

    for (const [field, value] of legacyFields) {
      const result = PlotSchema.safeParse(basePlot({ [field]: value }));

      expect(result.success).toBe(false);

      if (result.success) continue;

      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'unrecognized_keys', path: [], keys: expect.arrayContaining([field]) }),
        ]),
      );
    }
  });

  it('不根据默认值和规则创建轴、Legend、网格或标记对象', () => {
    const baseline = compilePlot(basePlot());
    const themed = compilePlot(
      basePlot({
        defaultPlot: {
          axis: { line: false, ticks: { mark: false }, tickLabels: false, title: false, grid: false },
          legend: { swatchSize: 24 },
        },
        plotRules: [{ select: { dimension: 'x' }, axis: { line: false, grid: false } }],
      }),
    );
    const baselinePrimitives = flattenPrimitives(baseline.primitives);
    const themedPrimitives = flattenPrimitives(themed.primitives);

    expect(themedPrimitives.map(primitive => primitive.type)).toEqual(
      baselinePrimitives.map(primitive => primitive.type),
    );
    expect(themedPrimitives.filter(primitive => primitive.type === 'text')).toHaveLength(0);
    expect(themedPrimitives.filter(primitive => primitive.type === 'path')).toHaveLength(0);
    expect(themedPrimitives.filter(primitive => primitive.type === 'ellipse')).toHaveLength(rows.length);
  });

  it('拒绝扇形调色板，同时保留间隔极坐标几何契约', () => {
    const result = PlotSchema.safeParse(basePlot({ defaultPlot: { palette: { sector: ['#ef4444', '#3b82f6'] } } }));

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unrecognized_keys',
            path: ['defaultPlot', 'palette'],
            keys: expect.arrayContaining(['sector']),
          }),
        ]),
      );
    }

    const resolution = resolvePlotTheme(DEFAULT_RESOLVED_THEME, {
      defaultPlot: { palette: { categorical: ['#2563eb'] } },
    });

    expect(JSON.stringify(resolution)).toContain('#2563eb');
    expect(JSON.stringify(resolution)).not.toContain('sector');
    expect(resolution.defaults.palette).not.toHaveProperty('sector');
    expect(resolution.layers.some(layer => layer.path.includes('plotTheme'))).toBe(false);
  });
});
