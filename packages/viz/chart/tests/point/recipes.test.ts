import type { IRJsonObject } from '@retikz/core';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { PathMarkSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { resolveSelectedChart } from '../../src/_chart/resolve';
import { ScatterMarkDefinition } from '../../src/point/scatter/mark';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';

const theme = { axisEnabled: true, axisGridEnabled: true, legendEnabled: true };

const resolve = (definition: typeof ScatterChartDefinition, encodings: IRJsonObject, properties: IRJsonObject = {}) =>
  definition.resolve({
    data: { reference: 'rows' },
    encodings,
    properties,
    recipeThemeTokens: theme,
  });

describe('Point Chart recipe Definitions', () => {
  it('Scatter creates a Point semantic mark and a Cartesian scaffold', () => {
    const result = resolve(ScatterChartDefinition, { x: 'amount', y: 'margin', size: 'weight' });
    expect(result.semanticMarks).toHaveLength(1);
    expect(result.semanticMarks[0]).toMatchObject({
      type: 'point',
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      size: { kind: 'field', value: 'weight' },
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
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks[1]).toEqual(path);
  });
});

describe('Point Chart marks', () => {
  it('scatter mark inherits x/y and lets explicit properties override inherited values', () => {
    const result = ScatterMarkDefinition.resolve({
      chartType: 'scatter',
      source: { kind: 'scatter', properties: { opacity: 0 } },
      inherited: { encodings: { x: 'amount', y: 'margin' }, properties: { opacity: 0.5 } },
      recipeThemeTokens: theme,
    });
    expect(result.marks[0]).toMatchObject({
      type: 'point',
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      opacity: { kind: 'constant', value: 0 },
    });
  });
});
