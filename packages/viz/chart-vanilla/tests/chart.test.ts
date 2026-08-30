import { ChartThemeToken, defineChartTheme } from '@retikz/chart';
import { defineThemeStyle } from '@retikz/core';
import { DataTransformBindingClass, DataTransformFieldEffect, DataTransformPhase, defineTransform } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { definePlotThemeStyle } from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { renderChart } from '../src';
import {
  createBubbleChart,
  createConnectedScatterChart,
  createRangedDotChart,
  createRegressionChart,
  createScatterChart,
} from '../src/point';

const rows = [
  { x: 1, y: 2, size: 3, order: 1 },
  { x: 2, y: 4, size: 5, order: 2 },
];

const regressionRows = [
  { x: 1, y: 2, species: 'setosa' },
  { x: 2, y: 4, species: 'setosa' },
  { x: 1, y: 3, species: 'versicolor' },
  { x: 2, y: 5, species: 'versicolor' },
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

  it('creates Regression Source, dataset binding, and its concrete provider contribution', () => {
    const chart = createRegressionChart({
      data: regressionRows,
      dataRef: 'regression.rows',
      encodings: { x: 'x', y: 'y', series: 'species' },
      properties: { method: { kind: 'linear' }, sampleCount: 8 },
    });

    expect(chart.source).toMatchObject({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'regression.rows' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', series: 'species' },
        properties: { method: { kind: 'linear' }, sampleCount: 8 },
      },
    });
    expect(chart.input.datasets).toEqual({ 'regression.rows': regressionRows });
    expect(chart.input.source).toBe(chart.source);
    expect(chart.input.chartProviderContribution.providers.at(-1)?.key).toEqual({
      capability: 'composite',
      namespace: 'chart',
      type: 'point',
    });
  });

  it('renders grouped Regression through SSR without serializing runtime Definitions', () => {
    const chart = createRegressionChart({
      id: 'regression',
      data: regressionRows,
      encodings: { x: 'x', y: 'y', series: 'species' },
      properties: { sampleCount: 8 },
    });
    const rendered = renderChart(chart);
    const serializedSource = JSON.stringify(chart.source);

    expect(rendered.svg).toContain('<svg');
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toContain('regression');
    expect(serializedSource).not.toMatch(/providers|definitions|schema|apply|lowerOptions/iu);
    expect(JSON.parse(serializedSource)).toEqual(chart.source);
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

  it('keeps the Core host Theme and Theme style definitions in the authoring result and SSR', () => {
    const hostThemeStyle = defineThemeStyle({
      name: 'host-style',
      resolve: () => ({ categorical: ['#123456'] }),
    });
    const result = createScatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      theme: { style: 'host-style', mode: 'dark' },
      themeStyles: [hostThemeStyle],
      themeDefinitions: [
        defineChartTheme({
          name: 'host-style',
          tokens: { chart: { [ChartThemeToken.CanvasFill]: '#ffffff' } },
        }),
      ],
      lowerOptions: {
        plotThemeStyles: [definePlotThemeStyle({ name: 'host-style', resolve: () => ({}) })],
      },
    });

    expect(result.theme).toEqual({ style: 'host-style', mode: 'dark' });
    expect(result.themeStyles).toEqual([hostThemeStyle]);
    expect(result.input).not.toHaveProperty('theme');
    expect(result.input).not.toHaveProperty('themeStyles');
    expect(renderChart(result).svg).toContain('#123456');
  });

  it('keeps named and inline Chart Themes in Source instead of treating them as Core host Themes', () => {
    const named = createScatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      theme: 'scatter-theme',
      themeDefinitions: [defineChartTheme({ name: 'scatter-theme', tokens: { chart: {} } })],
    });
    const inlineTheme = {
      tokens: { chart: { [ChartThemeToken.CanvasFill]: '#abcdef' } },
    } as const;
    const inline = createScatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      theme: inlineTheme,
    });

    expect(named.source.theme).toBe('scatter-theme');
    expect(named).not.toHaveProperty('theme');
    expect(inline.source.theme).toEqual(inlineTheme);
    expect(inline).not.toHaveProperty('theme');
  });

  it('routes Core host Theme metadata through the shared helper for every Point factory', () => {
    const factories = [
      () => createScatterChart({ data: rows, encodings: { x: 'x', y: 'y' }, theme: { mode: 'dark' } }),
      () => createBubbleChart({ data: rows, encodings: { x: 'x', y: 'y', size: 'size' }, theme: { mode: 'dark' } }),
      () =>
        createRegressionChart({
          data: regressionRows,
          encodings: { x: 'x', y: 'y' },
          theme: { mode: 'dark' },
        }),
      () =>
        createConnectedScatterChart({
          data: rows,
          encodings: { x: 'x', y: 'y', order: 'order' },
          theme: { mode: 'dark' },
        }),
      () =>
        createRangedDotChart({
          data: rows,
          encodings: { category: 'x', start: 'y', end: 'size' },
          theme: { mode: 'dark' },
        }),
    ];

    for (const create of factories) {
      const result = create();
      expect(result.theme).toEqual({ mode: 'dark' });
      expect(result.source).not.toHaveProperty('theme');
      expect(result.input).not.toHaveProperty('theme');
    }
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
