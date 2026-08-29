import { defineChartTheme } from '@retikz/chart';
import { DataTransformBindingClass, DataTransformFieldEffect, DataTransformPhase, defineTransform } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { renderChart } from '../src';
import { createBubbleChart, createScatterChart } from '../src/point';

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
  it('creates Bubble Source, one runtime dataset, and its concrete provider contribution', () => {
    const chart = createBubbleChart({
      data: rows,
      dataRef: 'bubble.rows',
      encodings: { x: 'x', y: 'y', size: 'size' },
    });

    expect(chart.source).toMatchObject({
      type: 'point',
      data: { reference: 'bubble.rows' },
      recipe: { chartType: 'bubble', encodings: { size: 'size' } },
    });
    expect(chart.input.datasets).toEqual({ 'bubble.rows': rows });
    expect(chart.input.source).toBe(chart.source);
    expect(chart.input.chartProviderContribution.providers.at(-1)?.key).toEqual({
      capability: 'composite',
      namespace: 'chart',
      type: 'point',
    });
  });

  it('renders Bubble through the same SSR path as other Point charts', () => {
    const chart = createBubbleChart({
      id: 'bubble',
      data: rows,
      encodings: { x: 'x', y: 'y', size: 'size' },
    });
    const rendered = renderChart(chart);

    expect(rendered.svg).toContain('<svg');
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toContain('bubble');
  });

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

  it('shares custom transform Definitions with Chart resolution and Plot lowering without serializing runtime', () => {
    const copyField = defineTransform({
      schema: strictObject({
        kind: literal('copy-chart-field'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputFields: operation => [operation.as],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.as, type: { from: operation.field } }],
      }),
      schedule: {
        phase: DataTransformPhase.FieldDerive,
        bindingClass: DataTransformBindingClass.Field,
        fieldEffect: DataTransformFieldEffect.Preserve,
      },
      apply: (inputRows, operation) => inputRows.map(row => ({ ...row, [operation.as]: row[operation.field] })),
    });
    const chart = createScatterChart({
      id: 'custom-transform',
      data: rows,
      encodings: {
        x: {
          transform: { kind: 'copy-chart-field', field: 'x', as: 'copiedX' },
          output: 'copiedX',
        },
        y: 'y',
      },
      lowerOptions: { transformDefinitions: [copyField] },
    });

    expect(() => renderChart(chart)).not.toThrow();
    expect(JSON.stringify(chart.source)).toContain('copy-chart-field');
    expect(JSON.stringify(chart.source)).not.toMatch(/outputModel|apply/);
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
      expect.arrayContaining(['scatter', 'scatter/plot', 'scatter/plot.mark.0', 'scatter/plot.plotArea']),
    );
  });

  it('does not synthesize Scene ids for an anonymous Chart without provenance', () => {
    const chart = createScatterChart({ data: rows, encodings: { x: 'x', y: 'y' } });
    const rendered = renderChart(chart);

    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toEqual([]);
  });
});
