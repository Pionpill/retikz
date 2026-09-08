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
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
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

describe('Plot Source defaults and rules', () => {
  it('accepts Source-shaped plotDefaults and ordered plotRules with JSON-safe round-trip', () => {
    const source = basePlot({
      plotDefaults: {
        plotArea: { fill: '#f8fafc' },
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

  it('rejects the removed token and native theme roots', () => {
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

  it('does not create Axis, Legend, grid, or mark objects from defaults and rules', () => {
    const baseline = compilePlot(basePlot());
    const themed = compilePlot(
      basePlot({
        plotDefaults: {
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

  it('rejects sector palettes while retaining the interval polar geometry contract', () => {
    const result = PlotSchema.safeParse(basePlot({ plotDefaults: { palette: { sector: ['#ef4444', '#3b82f6'] } } }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unrecognized_keys',
            path: ['plotDefaults', 'palette'],
            keys: expect.arrayContaining(['sector']),
          }),
        ]),
      );
    }

    const resolution = resolvePlotTheme(DEFAULT_RESOLVED_THEME, {
      plotDefaults: { palette: { categorical: ['#2563eb'] } },
    });
    expect(JSON.stringify(resolution)).toContain('#2563eb');
    expect(JSON.stringify(resolution)).not.toContain('sector');
    expect(resolution.defaults.palette).not.toHaveProperty('sector');
    expect(resolution.layers.some(layer => layer.path.includes('plotTheme'))).toBe(false);
  });
});
