import type { ScenePrimitive } from '@retikz/core';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { createPlotProviderContribution } from '@retikz/plot';
import { PathClipProvider } from '@retikz/standard/clip';
import { describe, expect, it } from 'vitest';

import { createScatterChartProviderContribution, ScatterChartSchema } from '../../src/point/scatter';

const rows = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
];

const baseChart = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
  ...overrides,
});

const compileChart = (source: unknown) => {
  const chart = ScatterChartSchema.parse(source);
  const definitions = resolveCoreProviderDependencies({
    contributions: [
      createScatterChartProviderContribution(),
      createPlotProviderContribution({ rows }),
      { roots: [PathClipProvider.key], providers: [PathClipProvider] },
    ],
  });
  return compileToScene({ version: 1, type: 'scene', children: [chart] }, { ...definitions, padding: 0 });
};

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrimitives(primitive.children)] : [primitive],
  );

const textPrimitives = (source: ReturnType<typeof compileChart>): Array<Extract<ScenePrimitive, { type: 'text' }>> =>
  flattenPrimitives(source.scene.primitives).filter(
    (primitive): primitive is Extract<ScenePrimitive, { type: 'text' }> => primitive.type === 'text',
  );

describe('Chart formal presentation, defaults, and Plot forwarding', () => {
  it('accepts formal presentation regions and sparse chartDefaults', () => {
    const source = baseChart({
      presentation: {
        title: {
          text: 'Revenue',
          style: { textColor: '#0f172a', font: { size: 20 }, opacity: 0 },
          layout: { align: 'start', lineHeight: 24, maxTextWidth: 320 },
        },
      },
      layout: { width: 640, height: 360, padding: 0, gap: 0 },
      chartDefaults: {
        background: { fill: '#f8fafc' },
        layout: { padding: 12, gap: 4 },
        presentation: { title: { style: { font: { size: 22 } }, layout: { align: 'middle' } } },
      },
    });
    const parsed = ScatterChartSchema.parse(source);

    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
  });

  it('does not create a title or other presentation region from defaults alone', () => {
    const output = compileChart(
      baseChart({
        chartDefaults: {
          presentation: {
            title: { style: { font: { size: 28 } } },
            subtitle: { style: { opacity: 0 } },
          },
        },
        plotExtension: { guides: [] },
      }),
    );

    expect(textPrimitives(output)).toHaveLength(0);
  });

  it('forwards Plot defaults through plotExtension without creating Chart-owned Plot state', () => {
    const output = compileChart(
      baseChart({
        plotExtension: {
          plotDefaults: { palette: { series: ['#0f766e'] } },
        },
      }),
    );

    expect(JSON.stringify(output.scene)).toContain('#0f766e');
    expect(JSON.stringify(output.scene)).not.toContain('chartDefaults');
  });
});
