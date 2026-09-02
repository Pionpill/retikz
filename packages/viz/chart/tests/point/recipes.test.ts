import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation, IRPlotScaleOperation } from '@retikz/plot';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { PathMarkSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import type {
  ChartEncodingRuntime,
  ChartRecipeDefinition,
  ChartScaleDefaultsResolveContext,
} from '../../src/_chart/contract';
import type { IRChartSource } from '../../src/_chart/schemas';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { BubbleMarkDefinition } from '../../src/point/bubble/mark';
import { BubbleChartDefinition } from '../../src/point/bubble/recipe';
import { BubbleChartSchema } from '../../src/point/bubble/schema';
import { ConnectedScatterChartDefinition } from '../../src/point/connected-scatter/recipe';
import { ConnectedScatterChartSchema } from '../../src/point/connected-scatter/schema';
import { RangedDotChartDefinition } from '../../src/point/ranged-dot/recipe';
import { RangedDotChartSchema } from '../../src/point/ranged-dot/schema';
import { RegressionChartDefinition } from '../../src/point/regression/recipe';
import { RegressionChartSchema } from '../../src/point/regression/schema';
import { ScatterMarkDefinition } from '../../src/point/scatter/mark';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';
import {
  pointFieldConsumersOf,
  pointPositionFieldConsumersOf,
  resolvePointScaleDefaults,
} from '../../src/point/shared';

const theme = { axisEnabled: true, axisGridEnabled: true, legendEnabled: true };
const runtime = resolveChartProviderRegistry([
  { family: 'point', recipe: ScatterChartDefinition, themeDefinitions: [] },
]).runtime;
const bubbleRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: BubbleChartDefinition, themeDefinitions: [] },
]).runtime;
const regressionRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: RegressionChartDefinition, themeDefinitions: [] },
]).runtime;
const connectedScatterRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: ConnectedScatterChartDefinition, themeDefinitions: [] },
]).runtime;
const rangedDotRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: RangedDotChartDefinition, themeDefinitions: [] },
]).runtime;

const resolve = <TSource extends IRChartSource>(
  definition: ChartRecipeDefinition<TSource>,
  encodings: IRJsonObject,
  properties: IRJsonObject = {},
) =>
  definition.resolve({
    data: { reference: 'rows' },
    encodings,
    properties,
    recipeThemeTokens: theme,
  });

const resolveChart = <TSource extends IRChartSource>(
  source: TSource,
  definition: ChartRecipeDefinition<TSource>,
  activeRuntime: ChartEncodingRuntime,
) =>
  resolveSelectedChart(source, {
    theme: DEFAULT_RESOLVED_THEME,
    recipe: definition,
    themeDefinitions: [],
    runtime: activeRuntime,
  });

const scaleDefaultsContextOf = (
  source: IRChartSource,
  chartMarks: ReadonlyArray<IRPlotMarkOperation>,
  scales: ReadonlyArray<IRPlotScaleOperation>,
): ChartScaleDefaultsResolveContext => ({
  source,
  encodings: {
    encodings: {},
    transform: [],
    scales: [],
    positionScales: {},
    removedRecipeScales: new Set<string>(),
  },
  chartMarks,
  scales,
  spatial: {
    coordinate: {
      type: 'cartesian2D',
      x: '__chart.scatter.scale.x',
      y: '__chart.scatter.scale.y',
    },
  },
});

describe('Point Chart recipe Definitions', () => {
  it('all Point chart types reserve continuous position ranges by their maximum final point radius', () => {
    const scatter = resolveChart(
      ScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
      }),
      ScatterChartDefinition,
      runtime,
    );
    const bubble = resolveChart(
      BubbleChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'bubble', encodings: { x: 'x', y: 'y', size: 'size' } },
      }),
      BubbleChartDefinition,
      bubbleRuntime,
    );
    const regression = resolveChart(
      RegressionChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y' } },
      }),
      RegressionChartDefinition,
      regressionRuntime,
    );
    const connectedScatter = resolveChart(
      ConnectedScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'connected-scatter', encodings: { x: 'x', y: 'y', order: 'order' } },
      }),
      ConnectedScatterChartDefinition,
      connectedScatterRuntime,
    );
    const rangedDot = resolveChart(
      RangedDotChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'ranged-dot',
          encodings: { category: 'category', start: 'start', end: 'end' },
        },
      }),
      RangedDotChartDefinition,
      rangedDotRuntime,
    );

    expect(scatter.plot.scales).toEqual([
      {
        type: 'linear',
        name: '__chart.scatter.scale.x',
        domainPadding: { kind: 'range', lower: 5, upper: 5 },
      },
      {
        type: 'linear',
        name: '__chart.scatter.scale.y',
        domainPadding: { kind: 'range', lower: 5, upper: 5 },
      },
    ]);
    expect(bubble.plot.scales).toEqual([
      {
        type: 'linear',
        name: '__chart.bubble.scale.x',
        domainPadding: { kind: 'range', lower: 20, upper: 20 },
      },
      {
        type: 'linear',
        name: '__chart.bubble.scale.y',
        domainPadding: { kind: 'range', lower: 20, upper: 20 },
      },
    ]);
    expect(regression.plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 5, upper: 5 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 5, upper: 5 } }),
    ]);
    expect(connectedScatter.plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 5, upper: 5 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 5, upper: 5 } }),
    ]);
    expect(rangedDot.plot.scales).toEqual([
      {
        type: 'linear',
        name: '__chart.ranged-dot.scale.x',
        domainPadding: { kind: 'range', lower: 5, upper: 5 },
      },
      { type: 'point', name: '__chart.ranged-dot.scale.y' },
    ]);
  });

  it.each([
    ['constant size', { properties: { size: 9 } }, 9],
    [
      'explicit sqrt range',
      {
        encodings: {
          size: {
            field: 'size',
            scale: { operation: { type: 'sqrt', name: 'sizeScale', range: [2, 13] } },
          },
        },
      },
      13,
    ],
    [
      'reversed sqrt range',
      {
        encodings: {
          size: {
            field: 'size',
            scale: { operation: { type: 'sqrt', name: 'sizeScale', range: [18, 2] } },
          },
        },
      },
      18,
    ],
  ])('uses the maximum final radius for %s', (_name, recipeOptions, radius) => {
    const options = recipeOptions as {
      properties?: IRJsonObject;
      encodings?: IRJsonObject;
    };
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y', ...(options.encodings ?? {}) },
        ...(options.properties === undefined ? {} : { properties: options.properties }),
      },
    });

    const result = resolveChart(source, ScatterChartDefinition, runtime);

    expect(result.plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: radius, upper: radius } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: radius, upper: radius } }),
    ]);
  });

  it('computes the maximum after authored additions and atomic override, excluding Plot extension marks', () => {
    const addition = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { size: 3 },
        marks: [{ kind: 'scatter', properties: { size: 12 } }],
      },
      plotExtension: {
        marks: [
          {
            type: 'point',
            encoding: { x: { field: 'x' }, y: { field: 'y' } },
            size: { kind: 'constant', value: 99 },
          },
        ],
      },
    });
    const override = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { size: 30 },
        marks: [{ kind: 'scatter', override: true, properties: { size: 4 } }],
      },
    });

    const additionResult = resolveChart(addition, ScatterChartDefinition, runtime);
    const overrideResult = resolveChart(override, ScatterChartDefinition, runtime);

    expect(additionResult.plot.scales[0]).toMatchObject({
      domainPadding: { kind: 'range', lower: 12, upper: 12 },
    });
    expect(overrideResult.plot.scales[0]).toMatchObject({
      domainPadding: { kind: 'range', lower: 4, upper: 4 },
    });
  });

  it('uses a referenced Plot extension sqrt scale to determine the maximum Point radius', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: {
          x: 'x',
          y: 'y',
          size: { field: 'size', scale: { reference: 'sizeScale' } },
        },
      },
      plotExtension: {
        scales: [{ type: 'sqrt', name: 'sizeScale', range: [3, 17] }],
      },
    });

    const result = resolveChart(source, ScatterChartDefinition, runtime);

    expect(result.plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 17, upper: 17 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 17, upper: 17 } }),
    ]);
    expect(result.plot.scales).toContainEqual({ type: 'sqrt', name: 'sizeScale', range: [3, 17] });
  });

  it('fails at the Chart owner boundary when a custom Point mark exposes an invalid effective radius', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
    });
    const positionScales = [
      { type: 'linear', name: '__chart.scatter.scale.x' },
      { type: 'linear', name: '__chart.scatter.scale.y' },
    ] as const;

    expect(() =>
      resolvePointScaleDefaults(
        scaleDefaultsContextOf(
          source,
          [
            {
              type: 'point',
              encoding: { x: { field: 'x' }, y: { field: 'y' } },
              size: { kind: 'constant', value: -1 },
            },
          ],
          positionScales,
        ),
      ),
    ).toThrowError(/finite nonnegative/);

    expect(() =>
      resolvePointScaleDefaults(
        scaleDefaultsContextOf(
          source,
          [
            {
              type: 'point',
              encoding: { x: { field: 'x' }, y: { field: 'y' } },
              size: { kind: 'field', value: 'size', scale: 'sizeScale' },
            },
          ],
          [...positionScales, { type: 'sqrt', name: 'sizeScale', range: [5, Number.POSITIVE_INFINITY] }],
        ),
      ),
    ).toThrowError(/finite nonnegative/);
  });

  it('uses the largest Point in regression, connected-scatter, and both Ranged Dot endpoints', () => {
    const regression = resolveChart(
      RegressionChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'regression',
          encodings: { x: 'x', y: 'y' },
          properties: { point: { size: 11 } },
        },
      }),
      RegressionChartDefinition,
      regressionRuntime,
    );
    const connected = resolveChart(
      ConnectedScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'connected-scatter',
          encodings: { x: 'x', y: 'y', order: 'order' },
          properties: { point: { size: 14 } },
        },
      }),
      ConnectedScatterChartDefinition,
      connectedScatterRuntime,
    );
    const ranged = resolveChart(
      RangedDotChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'ranged-dot',
          encodings: { category: 'category', start: 'start', end: 'end' },
          properties: { point: { size: 6 }, startPoint: { size: 8 }, endPoint: { size: 15 } },
        },
      }),
      RangedDotChartDefinition,
      rangedDotRuntime,
    );

    expect(regression.plot.scales[0]).toMatchObject({
      domainPadding: { kind: 'range', lower: 11, upper: 11 },
    });
    expect(connected.plot.scales[0]).toMatchObject({
      domainPadding: { kind: 'range', lower: 14, upper: 14 },
    });
    expect(ranged.plot.scales[0]).toMatchObject({
      domainPadding: { kind: 'range', lower: 15, upper: 15 },
    });
  });

  it('resolves Core side precedence, ratio gaps, and reversed Cartesian ranges', () => {
    const rangeSource = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { domainPadding: { default: 7, x: 8, left: 2, top: 3 } },
      },
    });
    const ratioSource = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { domainPadding: { kind: 'ratio', x: 0.1, left: 0.02 } },
      },
    });
    const reversedSource = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: {
          x: {
            field: 'x',
            scale: { operation: { type: 'linear', name: 'xScale', range: [100, 0] } },
          },
          y: {
            field: 'y',
            scale: { operation: { type: 'linear', name: 'yScale', range: [0, 100] } },
          },
        },
        properties: { domainPadding: { left: 2, right: 8, top: 3, bottom: 9 } },
      },
    });

    expect(resolveChart(rangeSource, ScatterChartDefinition, runtime).plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 2, upper: 8 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 7, upper: 3 } }),
    ]);
    expect(resolveChart(ratioSource, ScatterChartDefinition, runtime).plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'ratio', lower: 0.02, upper: 0.1 } }),
      expect.objectContaining({ domainPadding: { kind: 'ratio', lower: 0, upper: 0 } }),
    ]);
    expect(resolveChart(reversedSource, ScatterChartDefinition, runtime).plot.scales).toEqual([
      expect.objectContaining({ name: 'xScale', domainPadding: { kind: 'range', lower: 8, upper: 2 } }),
      expect.objectContaining({ name: 'yScale', domainPadding: { kind: 'range', lower: 3, upper: 9 } }),
    ]);
  });

  it('keeps explicit scale padding and Plot extension scale ownership ahead of Point defaults', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: {
          x: {
            field: 'x',
            scale: { operation: { type: 'linear', name: 'xScale', domainPadding: 0 } },
          },
          y: 'y',
        },
      },
      plotExtension: {
        scales: [{ type: 'log', name: '__chart.scatter.scale.y' }],
      },
    });

    const result = resolveChart(source, ScatterChartDefinition, runtime);

    expect(result.plot.scales).toEqual([
      { type: 'log', name: '__chart.scatter.scale.y' },
      { type: 'linear', name: 'xScale', domainPadding: 0 },
    ]);
  });

  it('allows axis spacing under Polar and rejects visual side spacing outside Cartesian coordinates', () => {
    const axisPadding = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      coordinate: { type: 'polar2D' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { domainPadding: { x: 2, y: 3 } },
      },
    });
    const sidePadding = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      coordinate: { type: 'polar2D' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { domainPadding: { left: 2 } },
      },
    });

    const result = resolveChart(axisPadding, ScatterChartDefinition, runtime);
    expect(result.plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 2, upper: 2 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 3, upper: 3 } }),
    ]);
    expect(() => resolveChart(sidePadding, ScatterChartDefinition, runtime)).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'properties', 'domainPadding', 'left'] }),
      }),
    );
  });

  it('rejects visual side spacing for a custom non-Cartesian coordinate', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { domainPadding: { right: 4 } },
      },
    });
    const context = scaleDefaultsContextOf(
      source,
      [
        {
          type: 'point',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
      [
        { type: 'linear', name: '__chart.scatter.scale.x' },
        { type: 'linear', name: '__chart.scatter.scale.y' },
      ],
    );

    expect(() =>
      resolvePointScaleDefaults({
        ...context,
        spatial: { coordinate: { type: 'bridge' } },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'properties', 'domainPadding', 'right'] }),
      }),
    );
  });

  it('regular Point charts carry their position padding into authored continuous scales', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: {
          x: {
            field: 'amount',
            scale: { operation: { type: 'log', name: 'amountScale' } },
          },
          y: 'margin',
        },
      },
    });

    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: ScatterChartDefinition,
      themeDefinitions: [],
      runtime,
    });

    expect(result.plot.scales).toContainEqual({
      type: 'log',
      name: 'amountScale',
      domainPadding: { kind: 'range', lower: 5, upper: 5 },
    });
  });

  it('Connected Scatter emits an ordered open Path before Point', () => {
    const result = resolve(
      ConnectedScatterChartDefinition,
      { x: 'x', y: 'y', order: 'year' },
      { point: { size: 4 }, path: { strokeWidth: 2, dashPattern: [4, 2], connectNulls: true } },
    );
    expect(result.semanticMarks).toEqual([
      {
        kind: 'connected-scatter',
        plotMarks: [
          expect.objectContaining({
            type: 'path',
            order: 'year',
            closed: false,
            connectNulls: true,
            dashPattern: { kind: 'constant', value: [4, 2] },
          }),
          expect.objectContaining({ type: 'point', size: { kind: 'constant', value: 4 } }),
        ],
      },
    ]);
  });

  it('Connected Scatter series groups Path and shares one color scale with Point', () => {
    const result = resolve(ConnectedScatterChartDefinition, { x: 'x', y: 'y', order: 'year', series: 'country' });
    const [path, point] = result.semanticMarks[0].plotMarks;
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'color' });
    expect(path).toMatchObject({
      series: 'country',
      stroke: { kind: 'field', value: 'country', scale: '__chart.connected-scatter.scale.series' },
    });
    expect(point).toMatchObject({
      color: { kind: 'field', value: 'country', scale: '__chart.connected-scatter.scale.series' },
    });
  });

  it('Connected Scatter explicit Point color overrides the inherited series color', () => {
    const result = resolve(
      ConnectedScatterChartDefinition,
      { x: 'x', y: 'y', order: 'year', series: 'country' },
      { point: { color: '#dc2626' }, path: { stroke: '#16a34a' } },
    );
    const [path, point] = result.semanticMarks[0].plotMarks;

    expect(path).toMatchObject({ stroke: { kind: 'constant', value: '#16a34a' } });
    expect(point).toMatchObject({ color: { kind: 'constant', value: '#dc2626' } });
  });

  it('Ranged Dot emits one projected Relation with endpoint glyphs and shared authored roles', () => {
    const result = resolve(
      RangedDotChartDefinition,
      { category: 'country', start: 'before', end: 'after' },
      {
        point: { size: 4, strokeWidth: 1 },
        startPoint: { color: '#2563eb' },
        endPoint: { color: '#dc2626', shape: 'diamond' },
        range: { stroke: '#64748b', strokeWidth: 2, dashPattern: [4, 2] },
      },
    );

    expect(result.semanticMarks).toEqual([
      {
        kind: 'ranged-dot',
        plotMarks: [
          expect.objectContaining({
            type: 'relation',
            source: { project: { x: 'before', y: 'country' } },
            target: { project: { x: 'after', y: 'country' } },
            style: expect.objectContaining({
              stroke: { kind: 'constant', value: '#64748b' },
              strokeWidth: { kind: 'constant', value: 2 },
            }),
            path: { options: { dashPattern: [4, 2] } },
            endpoints: {
              source: expect.objectContaining({
                color: { kind: 'constant', value: '#2563eb' },
                size: { kind: 'constant', value: 4 },
              }),
              target: expect.objectContaining({
                color: { kind: 'constant', value: '#dc2626' },
                shape: { kind: 'constant', value: 'diamond' },
                size: { kind: 'constant', value: 4 },
              }),
            },
          }),
        ],
      },
    ]);
  });

  it('Ranged Dot shares one color scale across connector and endpoints', () => {
    const result = resolve(RangedDotChartDefinition, {
      category: 'country',
      start: 'before',
      end: 'after',
      color: 'region',
    });
    const [relation] = result.semanticMarks[0].plotMarks;

    expect(result.scaffold.scales).toContainEqual({
      value: { type: 'ordinal', name: '__chart.ranged-dot.scale.color' },
      replaceable: true,
    });
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'color' });
    expect(relation).toMatchObject({
      encoding: { color: { field: 'region', scale: '__chart.ranged-dot.scale.color' } },
      endpoints: { source: {}, target: {} },
    });
  });

  it('Ranged Dot delegates its unconfigured connector and endpoint color to the Plot palette', () => {
    const source = RangedDotChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'ranged-dot',
        encodings: { category: 'category', start: 'start', end: 'end' },
      },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RangedDotChartDefinition,
      themeDefinitions: [],
      runtime: rangedDotRuntime,
    });

    expect(result.plot.marks).toEqual([
      expect.objectContaining({ type: 'relation', defaultColorGroup: '__chart.default-color.0', style: {} }),
    ]);
    expect(JSON.stringify(result.plot.marks)).not.toContain('currentColor');
  });

  it('Ranged Dot connects one authored x scale to both start and end', () => {
    const source = RangedDotChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'ranged-dot',
        encodings: {
          category: 'category',
          start: { field: 'before', scale: { operation: { type: 'log', name: 'rangeScale' } } },
          end: { field: 'after', scale: { reference: 'rangeScale' } },
        },
      },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RangedDotChartDefinition,
      themeDefinitions: [],
      runtime: rangedDotRuntime,
    });

    expect(result.plot.scales.map(scale => scale.name)).toEqual(['__chart.ranged-dot.scale.y', 'rangeScale']);
    expect(result.plot.coordinate).toMatchObject({ x: 'rangeScale', y: '__chart.ranged-dot.scale.y' });
  });

  it('Ranged Dot override replaces the complete semantic group and preserves authored start/end roles', () => {
    const source = RangedDotChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'ranged-dot',
        encodings: { category: 'category', start: 'start', end: 'end' },
        marks: [
          {
            kind: 'ranged-dot',
            override: true,
            encodings: { start: 'later', end: 'earlier' },
          },
        ],
      },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RangedDotChartDefinition,
      themeDefinitions: [],
      runtime: rangedDotRuntime,
    });

    expect(result.plot.marks).toHaveLength(1);
    expect(result.plot.marks[0]).toMatchObject({
      source: { project: { x: 'later', y: 'category' } },
      target: { project: { x: 'earlier', y: 'category' } },
    });
  });
  it('composes the unchanged Point consumers from the reusable x/y atom', () => {
    const positionConsumers = pointPositionFieldConsumersOf('scatter');
    const allConsumers = pointFieldConsumersOf('scatter');

    expect(positionConsumers.map(consumer => consumer.slot)).toEqual(['x', 'y']);
    expect(allConsumers.slice(0, 2)).toEqual(positionConsumers);
    expect(allConsumers.map(consumer => consumer.slot)).toEqual(['x', 'y', 'color', 'size', 'opacity', 'shape']);
    expect(positionConsumers.map(consumer => consumer.scale?.recipeFallback)).toEqual([
      { name: '__chart.scatter.scale.x', type: 'linear' },
      { name: '__chart.scatter.scale.y', type: 'linear' },
    ]);
  });

  it('forwards Point offsets and labels as raw mark properties exactly once', () => {
    const result = resolve(
      ScatterChartDefinition,
      { x: 'x', y: 'y' },
      { dx: 3, dy: -2, label: { content: { value: 'A' } } },
    );
    const [mark] = result.semanticMarks[0].plotMarks;

    expect(mark).toMatchObject({
      dx: 3,
      dy: -2,
      label: { content: { value: 'A' } },
    });
  });

  it('Regression creates one Point plus mark-local Smooth Path semantic group', () => {
    const result = resolve(
      RegressionChartDefinition,
      { x: 'sepalLength', y: 'petalLength' },
      {
        method: { kind: 'quadratic' },
        sampleCount: 5,
        extent: [1, 5],
        point: { size: 4 },
        trend: { strokeWidth: 2 },
      },
    );

    expect(result.semanticMarks).toEqual([
      {
        kind: 'regression',
        plotMarks: [
          expect.objectContaining({
            type: 'point',
            encoding: { x: { field: 'sepalLength' }, y: { field: 'petalLength' } },
            size: { kind: 'constant', value: 4 },
          }),
          expect.objectContaining({
            type: 'path',
            order: '__chart.regression.trend.x',
            closed: false,
            encoding: {
              x: { field: '__chart.regression.trend.x' },
              y: { field: '__chart.regression.trend.y' },
            },
            transform: [
              {
                kind: 'smooth',
                x: 'sepalLength',
                y: 'petalLength',
                method: { kind: 'quadratic' },
                sampleCount: 5,
                extent: [1, 5],
                xAs: '__chart.regression.trend.x',
                yAs: '__chart.regression.trend.y',
              },
            ],
            strokeWidth: { kind: 'constant', value: 2 },
          }),
        ],
      },
    ]);
    expect(result.scaffold.transform).toBeUndefined();
  });

  it('Regression assigns distinct default palette groups to ungrouped observations and trend', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y' } },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RegressionChartDefinition,
      themeDefinitions: [],
      runtime: regressionRuntime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks.map(mark => mark.defaultColorGroup)).toEqual([
      '__chart.default-color.0.observation',
      '__chart.default-color.0.trend',
    ]);
    expect(JSON.stringify(result.plot.marks)).not.toContain('currentColor');
  });

  it('Regression series preserves one shared field-color identity for observations and trend', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y', series: 'species' } },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RegressionChartDefinition,
      themeDefinitions: [],
      runtime: regressionRuntime,
    });
    const [point, path] = result.plot.marks;

    expect(result.plot.marks.map(mark => mark.defaultColorGroup)).toEqual([
      '__chart.default-color.0',
      '__chart.default-color.0',
    ]);
    expect(point).toMatchObject({
      color: { kind: 'field', value: 'species', scale: '__chart.regression.scale.series' },
    });
    expect(path).toMatchObject({
      stroke: { kind: 'field', value: 'species', scale: '__chart.regression.scale.series' },
    });
  });

  it('Connected Scatter assigns one default color group without constant color fallbacks', () => {
    const source = ConnectedScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'connected-scatter',
        encodings: { x: 'x', y: 'y', order: 'order' },
      },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: ConnectedScatterChartDefinition,
      themeDefinitions: [],
      runtime: connectedScatterRuntime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks.map(mark => mark.defaultColorGroup)).toEqual([
      '__chart.default-color.0',
      '__chart.default-color.0',
    ]);
    expect(JSON.stringify(result.plot.marks)).not.toContain('currentColor');
  });

  it('Regression series drives one shared ordinal identity, Smooth groupBy and default legend', () => {
    const scale = '__chart.regression.scale.series';
    const result = resolve(RegressionChartDefinition, {
      x: 'sepalLength',
      y: 'petalLength',
      series: { field: 'species', scale },
    });
    const [point, path] = result.semanticMarks[0].plotMarks;

    expect(result.scaffold.scales).toContainEqual({ value: { type: 'ordinal', name: scale }, replaceable: true });
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'color' });
    expect(point).toMatchObject({ color: { kind: 'field', value: 'species', scale } });
    expect(path).toMatchObject({
      series: 'species',
      stroke: { kind: 'field', value: 'species', scale },
      transform: [expect.objectContaining({ kind: 'smooth', groupBy: ['species'] })],
    });
  });

  it('Regression authored append and override preserve the complete group and deep-merge nested properties', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', series: 'series' },
        properties: {
          method: { kind: 'polynomial', order: 2 },
          sampleCount: 10,
          point: { size: 3, opacity: 0.4 },
          trend: { strokeWidth: 2, opacity: 0.6 },
        },
        marks: [
          {
            kind: 'regression',
            override: true,
            encodings: { x: 'x2' },
            properties: { point: { size: 5 }, trend: { strokeWidth: 4 } },
          },
          { kind: 'regression', properties: { trend: { opacity: 0.8 } } },
        ],
      },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RegressionChartDefinition,
      themeDefinitions: [],
      runtime: regressionRuntime,
    });

    expect(result.plot.marks).toHaveLength(4);
    expect(result.plot.marks[0]).toMatchObject({
      encoding: { x: { field: 'x2' }, y: { field: 'y' } },
      size: { kind: 'constant', value: 5 },
      opacity: { kind: 'constant', value: 0.4 },
      color: { kind: 'field', value: 'series', scale: '__chart.regression.scale.series' },
    });
    expect(result.plot.marks[1]).toMatchObject({
      strokeWidth: { kind: 'constant', value: 4 },
      opacity: { kind: 'constant', value: 0.6 },
      transform: [
        expect.objectContaining({
          x: 'x2',
          y: 'y',
          method: { kind: 'polynomial', order: 2 },
          sampleCount: 10,
          groupBy: ['series'],
        }),
      ],
    });
    expect(result.plot.marks[2]).toMatchObject({
      size: { kind: 'constant', value: 3 },
      opacity: { kind: 'constant', value: 0.4 },
    });
    expect(result.plot.marks[3]).toMatchObject({
      strokeWidth: { kind: 'constant', value: 2 },
      opacity: { kind: 'constant', value: 0.8 },
    });
  });

  it('Regression replaces only its series fallback with an authored ordinal scale', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'regression',
        encodings: {
          x: 'x',
          y: 'y',
          series: { field: 'series', scale: { operation: { type: 'ordinal', name: 'authoredSeries' } } },
        },
      },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: RegressionChartDefinition,
      themeDefinitions: [],
      runtime: regressionRuntime,
    });

    expect(result.plot.scales.map(scale => scale.name)).toEqual([
      '__chart.regression.scale.x',
      '__chart.regression.scale.y',
      'authoredSeries',
    ]);
    expect(result.plot.marks[0]).toMatchObject({
      color: { kind: 'field', value: 'series', scale: 'authoredSeries' },
    });
    expect(result.plot.marks[1]).toMatchObject({
      stroke: { kind: 'field', value: 'series', scale: 'authoredSeries' },
    });
  });

  it('Bubble creates a Point semantic mark with inherited size and a default size legend', () => {
    const result = resolve(BubbleChartDefinition, {
      x: 'income',
      y: 'lifeExpectancy',
      size: 'population',
      color: 'continent',
    });

    expect(result.semanticMarks).toEqual([
      expect.objectContaining({
        kind: 'bubble',
        plotMarks: [
          expect.objectContaining({
            type: 'point',
            encoding: { x: { field: 'income' }, y: { field: 'lifeExpectancy' } },
            size: { kind: 'field', value: 'population' },
            fillOpacity: { kind: 'constant', value: 0.7 },
            strokeWidth: { kind: 'constant', value: 1 },
          }),
        ],
      }),
    ]);
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'size' });
  });

  it('Bubble carries its position padding into authored continuous scales unless explicitly overridden', () => {
    const source = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'bubble',
        properties: { domainPadding: { x: 0.03, y: 0.04 } },
        encodings: {
          x: {
            field: 'income',
            scale: { operation: { type: 'log', name: 'incomeScale' } },
          },
          y: {
            field: 'lifeExpectancy',
            scale: {
              operation: {
                type: 'linear',
                name: 'lifeExpectancyScale',
                domainPadding: 0,
              },
            },
          },
          size: 'population',
        },
      },
    });

    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: BubbleChartDefinition,
      themeDefinitions: [],
      runtime: bubbleRuntime,
    });

    expect(result.plot.scales).toEqual([
      {
        type: 'log',
        name: 'incomeScale',
        domainPadding: { kind: 'range', lower: 0.03, upper: 0.03 },
      },
      { type: 'linear', name: 'lifeExpectancyScale', domainPadding: 0 },
    ]);
  });

  it('keeps the core size mapping on ordinary and override Bubble marks', () => {
    const source = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'bubble',
        encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        marks: [
          { kind: 'bubble', override: true, properties: { opacity: 0.75 } },
          { kind: 'bubble', properties: { strokeWidth: 1 } },
        ],
      },
    });

    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: BubbleChartDefinition,
      themeDefinitions: [],
      runtime: bubbleRuntime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks[0]).toMatchObject({
      size: { kind: 'field', value: 'population' },
      fillOpacity: { kind: 'constant', value: 0.7 },
      strokeWidth: { kind: 'constant', value: 1 },
    });
    expect(result.plot.marks[1]).toMatchObject({
      size: { kind: 'field', value: 'population' },
      fillOpacity: { kind: 'constant', value: 0.7 },
      strokeWidth: { kind: 'constant', value: 1 },
    });
  });

  it('Scatter creates a Point semantic mark and a Cartesian scaffold', () => {
    const result = resolve(ScatterChartDefinition, { x: 'amount', y: 'margin', size: 'weight' });
    expect(result.semanticMarks).toHaveLength(1);
    expect(result.semanticMarks[0]).toMatchObject({
      kind: 'scatter',
      plotMarks: [
        {
          type: 'point',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
          size: { kind: 'field', value: 'weight' },
        },
      ],
    });
    expect(result.scaffold.spatial).toMatchObject({ coordinate: { type: 'cartesian2D' } });
  });

  it('keeps an explicit Plot Path independent from Scatter slots', () => {
    const path = PathMarkSchema.parse({
      type: 'path',
      order: 'path-order',
      encoding: { x: { field: 'path-x' }, y: { field: 'path-y' } },
      stroke: { kind: 'constant', value: '#2563eb' },
    });
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'scatter-x', y: 'scatter-y' },
        properties: { color: '#ef4444' },
      },
      plotExtension: { marks: [path] },
    });

    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: ScatterChartDefinition,
      themeDefinitions: [],
      runtime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks[1]).toEqual(path);
  });
});

describe('Point Chart marks', () => {
  it('Bubble mark inherits the recipe size when another property is explicit', () => {
    const result = BubbleMarkDefinition.resolve({
      chartType: 'bubble',
      source: { kind: 'bubble', properties: { opacity: 0.5 } },
      inherited: {
        encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        properties: {},
      },
      recipeThemeTokens: theme,
    });

    expect(result.marks[0]).toMatchObject({
      size: { kind: 'field', value: 'population' },
      opacity: { kind: 'constant', value: 0.5 },
      fillOpacity: { kind: 'constant', value: 0.7 },
      strokeWidth: { kind: 'constant', value: 1 },
    });
  });

  it('Bubble mark lets explicit appearance override its defaults', () => {
    const result = BubbleMarkDefinition.resolve({
      chartType: 'bubble',
      source: {
        kind: 'bubble',
        properties: { fillOpacity: 0.9, stroke: '#0f172a', strokeWidth: 2 },
      },
      inherited: {
        encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        properties: {},
      },
      recipeThemeTokens: theme,
    });

    expect(result.marks[0]).toMatchObject({
      fillOpacity: { kind: 'constant', value: 0.9 },
      stroke: { kind: 'constant', value: '#0f172a' },
      strokeWidth: { kind: 'constant', value: 2 },
    });
  });

  it('scatter mark inherits x/y and lets explicit properties override inherited values', () => {
    const result = ScatterMarkDefinition.resolve({
      chartType: 'scatter',
      source: { kind: 'scatter', properties: { opacity: 0 } },
      inherited: {
        encodings: { x: 'amount', y: 'margin', opacity: 'opacityField' },
        properties: { opacity: 0.5 },
      },
      recipeThemeTokens: theme,
    });
    expect(result.marks[0]).toMatchObject({
      type: 'point',
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      opacity: { kind: 'constant', value: 0 },
    });
  });

  it('lets an explicit mark encoding override both inherited encoding and explicit property', () => {
    const result = ScatterMarkDefinition.resolve({
      chartType: 'scatter',
      source: {
        kind: 'scatter',
        encodings: { opacity: 'explicitOpacity' },
        properties: { opacity: 0 },
      },
      inherited: {
        encodings: { x: 'amount', y: 'margin', opacity: 'inheritedOpacity' },
        properties: { opacity: 0.5 },
      },
      recipeThemeTokens: theme,
    });

    expect(result.marks[0]).toMatchObject({
      opacity: { kind: 'field', value: 'explicitOpacity' },
    });
  });
});
