import type { IRJsonObject } from '@retikz/core';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { PathMarkSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import type { ChartRecipeDefinition } from '../../src/_chart/contract';
import type { IRChartSource } from '../../src/_chart/schemas';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { BubbleMarkDefinition } from '../../src/point/bubble/mark';
import { BubbleChartDefinition } from '../../src/point/bubble/recipe';
import { BubbleChartSchema } from '../../src/point/bubble/schema';
import { ConnectedScatterChartDefinition } from '../../src/point/connected-scatter/recipe';
import { RangedDotChartDefinition } from '../../src/point/ranged-dot/recipe';
import { RangedDotChartSchema } from '../../src/point/ranged-dot/schema';
import { RegressionChartDefinition } from '../../src/point/regression/recipe';
import { RegressionChartSchema } from '../../src/point/regression/schema';
import { ScatterMarkDefinition } from '../../src/point/scatter/mark';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';
import { pointFieldConsumersOf, pointPositionFieldConsumersOf } from '../../src/point/shared';

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

describe('Point Chart recipe Definitions', () => {
  it('Bubble reserves the position domain for its maximum point radius', () => {
    const result = resolve(BubbleChartDefinition, {
      x: 'income',
      y: 'lifeExpectancy',
      size: 'population',
    });

    expect(result.scaffold.scales.map(scale => scale.value)).toEqual([
      { type: 'linear', name: '__chart.bubble.scale.x', domainPadding: 0.08 },
      { type: 'linear', name: '__chart.bubble.scale.y', domainPadding: 0.08 },
    ]);
  });

  it('regular Point recipes reserve the position domain for their point radius', () => {
    const scatter = resolve(ScatterChartDefinition, { x: 'x', y: 'y' });
    const regression = resolve(RegressionChartDefinition, { x: 'x', y: 'y' });
    const connectedScatter = resolve(ConnectedScatterChartDefinition, { x: 'x', y: 'y', order: 'order' });

    expect([
      scatter.scaffold.scales.map(scale => scale.value),
      regression.scaffold.scales.map(scale => scale.value),
      connectedScatter.scaffold.scales.map(scale => scale.value),
    ]).toEqual([
      [
        { type: 'linear', name: '__chart.scatter.scale.x', domainPadding: 0.02 },
        { type: 'linear', name: '__chart.scatter.scale.y', domainPadding: 0.02 },
      ],
      [
        { type: 'linear', name: '__chart.regression.scale.x', domainPadding: 0.02 },
        { type: 'linear', name: '__chart.regression.scale.y', domainPadding: 0.02 },
      ],
      [
        { type: 'linear', name: '__chart.connected-scatter.scale.x', domainPadding: 0.02 },
        { type: 'linear', name: '__chart.connected-scatter.scale.y', domainPadding: 0.02 },
      ],
    ]);
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
      domainPadding: 0.02,
    });
  });

  it('Ranged Dot reserves only its continuous position domain for the regular endpoint radius', () => {
    const result = resolve(RangedDotChartDefinition, {
      category: 'country',
      start: 'before',
      end: 'after',
    });

    expect(result.scaffold.scales.map(scale => scale.value)).toEqual([
      { type: 'linear', name: '__chart.ranged-dot.scale.x', domainPadding: 0.02 },
      { type: 'point', name: '__chart.ranged-dot.scale.y' },
    ]);
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
            color: { kind: 'constant', value: 'currentColor' },
            size: { kind: 'constant', value: 4 },
          }),
          expect.objectContaining({
            type: 'path',
            order: '__chart.regression.trend.x',
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
            stroke: { kind: 'constant', value: 'currentColor' },
            strokeWidth: { kind: 'constant', value: 2 },
          }),
        ],
      },
    ]);
    expect(result.scaffold.transform).toBeUndefined();
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
      { type: 'log', name: 'incomeScale', domainPadding: 0.08 },
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
