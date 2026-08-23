import { defineChartTheme } from '@retikz/chart';
import { describe, expect, it } from 'vitest';

import { renderChart } from '../src';
import { createScatterChart } from '../src/point';

const rows = [
  { x: 1, y: 2, size: 3, order: 1 },
  { x: 2, y: 4, size: 5, order: 2 },
];

type ScenePrimitiveLike = Readonly<{
  id?: string;
  children?: ReadonlyArray<ScenePrimitiveLike>;
}>;

const sceneIdsOf = (primitives: ReadonlyArray<ScenePrimitiveLike>): Array<string> =>
  primitives.flatMap(primitive => [
    ...(primitive.id === undefined ? [] : [primitive.id]),
    ...sceneIdsOf(primitive.children ?? []),
  ]);

describe('Chart Vanilla authoring', () => {
  it('does not expose a generic Chart authoring path', async () => {
    const module = await import('../src');
    expect(module).not.toHaveProperty('createChart');
    expect(module).not.toHaveProperty('normalizeChart');
  });

  it('forwards named Theme definitions and Plot lowering options without putting them in Source', () => {
    const themeDefinitions = [defineChartTheme({ name: 'scatter-theme', tokens: { chart: {} } })];
    const lowerOptions = { fieldMaps: { rows: { x: 'x' } } } as const;
    const result = createScatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      themeDefinitions,
      lowerOptions,
    });

    expect(result.input).not.toHaveProperty('themeDefinitions');
    expect(result.input.lowerOptions).toBe(lowerOptions);
    expect(result.source).not.toHaveProperty('themeDefinitions');
  });

  it('normalizes typed Point factories to family plus chartType Source IR', () => {
    const scatter = createScatterChart({ data: rows, encodings: { x: 'x', y: 'y' } });

    expect(scatter.source).toMatchObject({ type: 'point', recipe: { chartType: 'scatter' } });
    expect(scatter.source).not.toHaveProperty('config');
  });

  it('preserves Chart, derived Plot, mark, and Plot-area identity through the Core adapter', () => {
    const chart = createScatterChart({
      id: 'scatter',
      data: rows,
      encodings: { x: 'x', y: 'y' },
      layout: { width: 320, height: 200 },
      lowerOptions: { provenance: true, datumProvenance: true },
    });
    const rendered = renderChart(chart, { output: { width: 320, height: 200 } });

    expect(rendered.svg).toContain('<svg');
    expect(rendered.compileResult.scene.primitives).toHaveLength(1);
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toEqual(
      expect.arrayContaining([
        'scatter',
        'scatter/plot',
        'scatter/plot.__chart.scatter.mark.main',
        'scatter/plot.plotArea',
      ]),
    );
  });
});
