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
import { ScatterMarkDefinition } from '../../src/point/scatter/mark';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';

const theme = { axisEnabled: true, axisGridEnabled: true, legendEnabled: true };
const runtime = resolveChartProviderRegistry([
  { family: 'point', recipe: ScatterChartDefinition, themeDefinitions: [] },
]).runtime;
const bubbleRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: BubbleChartDefinition, themeDefinitions: [] },
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
