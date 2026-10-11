import type { IRChartSource } from '@retikz/chart';
import { defineChartTheme } from '@retikz/chart';
import { defineThemeStyle } from '@retikz/core';
import {
  defineTransformImplementation,
  defineRegressionImplementation,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineTransform,
  defineRegression,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { definePlotThemeStyle } from '@retikz/plot';
import type { AnyInputEmbed } from '@retikz/vanilla';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { renderChart } from '../src';
import {
  ScatterChartInputEmbedAdapter,
  BubbleChartInputEmbedAdapter,
  ConnectedScatterChartInputEmbedAdapter,
  RangedDotChartInputEmbedAdapter,
  RegressionChartInputEmbedAdapter,
  StripChartInputEmbedAdapter,
} from '../src/point';
import {
  bubbleChart,
  connectedScatterChart,
  rangedDotChart,
  regressionChart,
  scatterChart,
  stripChart,
} from '../src/point';

const adapters = [
  ScatterChartInputEmbedAdapter,
  BubbleChartInputEmbedAdapter,
  ConnectedScatterChartInputEmbedAdapter,
  RangedDotChartInputEmbedAdapter,
  RegressionChartInputEmbedAdapter,
  StripChartInputEmbedAdapter,
];

const sourceOf = (chart: AnyInputEmbed): IRChartSource =>
  normalizeScene(scene({ children: [chart] }), { adapters }).ir.children[0] as IRChartSource;

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
    const chart = bubbleChart({
      data: rows,
      dataRef: 'bubble.rows',
      encodings: { x: 'x', y: 'y', size: 'size' },
    });

    expect(sourceOf(chart)).toMatchObject({
      type: 'point',
      data: { reference: 'bubble.rows' },
      recipe: { chartType: 'bubble', encodings: { size: 'size' } },
    });
    expect({ [chart.props.dataRef ?? 'chart.data']: chart.props.data }).toEqual({ 'bubble.rows': rows });
  });

  it('renders Bubble through the same SSR path as other Point charts', () => {
    const chart = bubbleChart({
      id: 'bubble',
      data: rows,
      encodings: { x: 'x', y: 'y', size: 'size' },
    });
    const rendered = renderChart(chart, { adapters });

    expect(rendered.svg).toContain('<svg');
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toContain('bubble');
  });

  it('creates Regression Source, dataset binding, and its concrete provider contribution', () => {
    const chart = regressionChart({
      data: regressionRows,
      dataRef: 'regression.rows',
      encodings: { x: 'x', y: 'y', series: 'species' },
      properties: { method: { kind: 'linear' }, sampleCount: 8 },
    });

    expect(sourceOf(chart)).toMatchObject({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'regression.rows' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', series: 'species' },
        properties: { method: { kind: 'linear' }, sampleCount: 8 },
      },
    });
    expect({ [chart.props.dataRef ?? 'chart.data']: chart.props.data }).toEqual({ 'regression.rows': regressionRows });
  });

  it('renders grouped Regression through SSR without serializing runtime Definitions', () => {
    const chart = regressionChart({
      id: 'regression',
      data: regressionRows,
      encodings: { x: 'x', y: 'y', series: 'species' },
      properties: { sampleCount: 8, extraMethods: [{ method: { kind: 'power' }, trend: { stroke: '#ff0000' } }] },
    });
    const rendered = renderChart(chart, { adapters });
    const serializedSource = JSON.stringify(sourceOf(chart));

    expect(rendered.svg).toContain('<svg');
    expect(rendered.svg).toContain('#ff0000');
    expect((rendered.svg.match(/<ellipse\b/g) ?? []).length).toBe(regressionRows.length);
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toContain('regression');
    expect(serializedSource).not.toMatch(/providers|definitions|schema|apply|lowerOptions/iu);
    expect(JSON.parse(serializedSource)).toEqual(sourceOf(chart));
  });

  it('does not expose a generic Chart authoring path', async () => {
    const module = await import('../src');

    expect(module).not.toHaveProperty('createChart');
    expect(module).not.toHaveProperty('normalizeChart');
  });

  it('forwards named Theme definitions and Plot lowering options without putting them in Source', () => {
    const themeDefinitions = [defineChartTheme({ name: 'scatter-theme', defaults: { layout: { gap: 8 } } })];
    const lowerOptions = { fieldMaps: { rows: { x: 'x' } } } as const;
    const result = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      themeDefinitions,
      lowerOptions,
    });

    expect(result.props.themeDefinitions).toBe(themeDefinitions);
    expect(result.props.lowerOptions).toBe(lowerOptions);
    expect(sourceOf(result)).not.toHaveProperty('themeDefinitions');
  });

  it('keeps the Core host Theme and Theme style definitions in the authoring result and SSR', () => {
    const hostThemeStyle = defineThemeStyle({
      name: 'host-style',
      resolve: () => ({ categorical: ['#123456'] }),
    });
    const result = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      theme: { style: 'host-style', mode: 'dark' },
      themeStyles: [hostThemeStyle],
      themeDefinitions: [
        defineChartTheme({
          name: 'host-style',
          defaults: { background: { fill: '#ffffff' } },
        }),
      ],
      lowerOptions: {
        plotThemeStyles: [definePlotThemeStyle({ name: 'host-style', resolve: () => ({}) })],
      },
    });

    expect(result.props.theme).toEqual({ style: 'host-style', mode: 'dark' });
    expect(result.props.themeStyles).toEqual([hostThemeStyle]);
    expect(sourceOf(result)).not.toHaveProperty('theme');
    expect(sourceOf(result)).not.toHaveProperty('themeStyles');
    expect(renderChart(result, { adapters }).svg).toContain('#123456');
  });

  it('writes explicit Chart defaults into Source while keeping Core theme in the host result', () => {
    const result = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      chartDefaults: { background: { fill: '#abcdef' } },
    });

    expect(sourceOf(result).chartDefaults).toEqual({ background: { fill: '#abcdef' } });
    expect(result).not.toHaveProperty('theme');
  });

  it('forwards sparse Point recipe guide controls through concrete factories', () => {
    const scatter = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y', size: 'size' },
      guides: { axis: false, grid: false, legend: false },
    });
    const strip = stripChart({
      data: rows,
      encodings: {
        x: { field: 'x', scale: { operation: { type: 'point', name: 'x' } } },
        y: { field: 'y', scale: { operation: { type: 'linear', name: 'y' } } },
      },
      guides: { grid: false },
    });

    expect(sourceOf(scatter).recipe.guides).toEqual({ axis: false, grid: false, legend: false });
    expect(sourceOf(strip).recipe.guides).toEqual({ grid: false });
  });

  it('routes Core host Theme metadata through the shared helper for every Point factory', () => {
    const factories = [
      () => scatterChart({ data: rows, encodings: { x: 'x', y: 'y' }, theme: { mode: 'dark' } }),
      () => bubbleChart({ data: rows, encodings: { x: 'x', y: 'y', size: 'size' }, theme: { mode: 'dark' } }),
      () =>
        regressionChart({
          data: regressionRows,
          encodings: { x: 'x', y: 'y' },
          theme: { mode: 'dark' },
        }),
      () =>
        connectedScatterChart({
          data: rows,
          encodings: { x: 'x', y: 'y', order: 'order' },
          theme: { mode: 'dark' },
        }),
      () =>
        rangedDotChart({
          data: rows,
          encodings: { category: 'x', start: 'y', end: 'size' },
          theme: { mode: 'dark' },
        }),
    ];

    for (const create of factories) {
      const result = create();

      expect(result.props.theme).toEqual({ mode: 'dark' });
      expect(sourceOf(result)).not.toHaveProperty('theme');
      expect(sourceOf(result)).not.toHaveProperty('theme');
    }
  });

  it('shares custom transform Definitions with Chart resolution and Plot lowering without serializing runtime', () => {
    const copyField = defineTransform({
      kind: 'copy-chart-field',
      paramsSchema: strictObject({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
      inputFields: operation => [operation.params.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as, type: { from: operation.params.field } }],
      }),
      schedule: {
        phase: DataTransformPhase.FieldDerive,
        bindingClass: DataTransformBindingClass.Field,
        fieldEffect: DataTransformFieldEffect.Preserve,
      },
    });
    const copyFieldImplementation = defineTransformImplementation({
      definition: copyField,
      apply: (inputRows, operation) =>
        inputRows.map(row => ({ ...row, [operation.params.as]: row[operation.params.field] })),
    });
    const chart = scatterChart({
      id: 'custom-transform',
      data: rows,
      encodings: {
        x: {
          transform: { operation: { kind: 'copy-chart-field', params: { field: 'x', as: 'copiedX' } } },
          output: 'copiedX',
        },
        y: 'y',
      },
      lowerOptions: { transformDefinitions: [copyField], transformImplementations: [copyFieldImplementation] },
    });

    expect(() => renderChart(chart, { adapters })).not.toThrow();
    expect(JSON.stringify(sourceOf(chart))).toContain('copy-chart-field');
    expect(JSON.stringify(sourceOf(chart))).not.toMatch(/outputModel|apply/);
  });

  it('normalizes typed Point factories to family plus chartType Source IR', () => {
    const scatter = scatterChart({ data: rows, encodings: { x: 'x', y: 'y' } });

    expect(sourceOf(scatter)).toMatchObject({ type: 'point', recipe: { chartType: 'scatter' } });
    expect(sourceOf(scatter)).not.toHaveProperty('config');
  });

  it('preserves Chart, derived Plot, mark, and Plot-area identity through the Core adapter', () => {
    const chart = scatterChart({
      id: 'scatter',
      data: rows,
      encodings: { x: 'x', y: 'y' },
      layout: { width: 320, height: 200 },
      lowerOptions: { provenance: true, datumProvenance: true },
    });
    const rendered = renderChart(chart, { adapters, output: { width: 320, height: 200 } });

    expect(rendered.svg).toContain('<svg');
    expect(rendered.compileResult.scene.primitives).toHaveLength(1);
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toEqual(
      expect.arrayContaining(['scatter', 'scatter/plot', 'scatter/plot.mark.0', 'scatter/plot.plotArea']),
    );
  });

  it('显式宽高直接决定取景，输出尺寸只改变显示尺寸', () => {
    const chart = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      layout: { width: 320, height: 200 },
    });
    const rendered = renderChart(chart, { adapters });
    const scaled = renderChart(chart, { adapters, output: { width: 640, height: 400 } });

    expect(rendered.compileResult.scene.layout).toEqual({ x: 0, y: 0, width: 320, height: 200 });
    expect(rendered.svg).toContain('viewBox="0 0 320 200"');
    expect(scaled.compileResult.scene.layout).toEqual(rendered.compileResult.scene.layout);
    expect(scaled.svg).toContain('width="640" height="400"');
    expect(scaled.svg).toContain('viewBox="0 0 320 200"');
  });

  it.each([undefined, { width: 320 }])('没有完整布局尺寸时保留自动取景与显式 padding：%j', layout => {
    const chart = scatterChart({ data: rows, encodings: { x: 'x', y: 'y' }, layout });
    const automatic = renderChart(chart, { adapters }).compileResult.scene.layout;
    const unpadded = renderChart(chart, { adapters, compile: { padding: 0 } }).compileResult.scene.layout;

    expect(automatic.width).toBeCloseTo(unpadded.width + 20);
    expect(automatic.height).toBeCloseTo(unpadded.height + 20);
  });

  it('does not synthesize Scene ids for an anonymous Chart without provenance', () => {
    const chart = scatterChart({ data: rows, encodings: { x: 'x', y: 'y' } });
    const rendered = renderChart(chart, { adapters });

    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toEqual([]);
  });
});

describe('custom regression SSR', () => {
  it('consumes runtime definitions and leaves only JSON method parameters in Source', () => {
    const definition = defineRegression({ schema: strictObject({ kind: literal('identity-fit') }) });
    const definitionImplementation = defineRegressionImplementation({
      definition,
      fit: () => ({ predict: x => x }),
    });
    const chart = regressionChart({
      data: regressionRows,
      encodings: { x: 'x', y: 'y' },
      properties: { method: { kind: 'identity-fit' }, trend: { curve: 'catmullRom' } },
      lowerOptions: { regressionDefinitions: [definition], regressionImplementations: [definitionImplementation] },
    });
    const rendered = renderChart(chart, { adapters });

    expect(rendered.svg).toContain('<svg');
    expect((rendered.svg.match(/<ellipse\b/g) ?? []).length).toBe(regressionRows.length);
    expect(JSON.stringify(sourceOf(chart))).not.toMatch(/regressionDefinitions|predict|schema/);
  });
});
