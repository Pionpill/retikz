import { describe, expect, it } from 'vitest';

import {
  RegressionChartEncodingsSchema,
  RegressionChartMarkSchema,
  RegressionChartPropertiesSchema,
  RegressionChartSchema,
} from '../../src/point/regression';

const minimalSource = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'regression',
    encodings: { x: 'sepalLength', y: 'petalLength' },
  },
} as const;

describe('Regression exact Source schema', () => {
  it('accepts the minimal Source without materializing runtime defaults', () => {
    expect(RegressionChartSchema.parse(minimalSource)).toEqual(minimalSource);
  });

  it('accepts the full JSON form and preserves round-trip equality', () => {
    const source = {
      namespace: 'chart',
      type: 'point',
      id: 'iris-regression',
      data: { reference: 'iris' },
      recipe: {
        chartType: 'regression',
        encodings: {
          x: { aggregate: { kind: 'mean', field: 'sepalLength', as: 'meanSepalLength' } },
          y: { field: 'petalLength', scale: { operation: { type: 'log', name: 'petalScale' } } },
          series: { field: 'species', scale: { operation: { type: 'ordinal', name: 'speciesScale' } } },
          row: 'island',
          facet: { empty: 'show' },
        },
        properties: {
          method: { kind: 'polynomial', order: 6 },
          sampleCount: 96,
          extent: [1, 8],
          point: { size: 4, fill: '#2563eb', opacity: 0.7 },
          trend: {
            stroke: '#dc2626',
            strokeWidth: 2,
            strokeOpacity: 0.8,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            zIndex: 2,
            dashPattern: [4, 2],
            shadow: 'sm',
            blendMode: 'multiply',
          },
        },
        marks: [
          {
            kind: 'regression',
            override: true,
            encodings: { x: 'sepalWidth' },
            properties: {
              method: { kind: 'quadratic' },
              point: { size: 6 },
              trend: { strokeWidth: 3 },
            },
          },
        ],
      },
    };

    expect(RegressionChartSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it.each([
    ['missing x', { y: 'petalLength' }],
    ['missing y', { x: 'sepalLength' }],
    ['blank x', { x: '', y: 'petalLength' }],
    ['blank y', { x: 'sepalLength', y: '' }],
  ])('rejects %s', (_name, encodings) => {
    expect(() => RegressionChartEncodingsSchema.parse(encodings)).toThrow();
  });

  it.each([
    ['aggregate series', { aggregate: { kind: 'count', as: 'count' } }],
    ['derived series', { transform: { kind: 'normalize', field: 'species' }, output: 'species' }],
    ['constant series', 3],
    ['sequential series scale', { field: 'species', scale: { operation: { type: 'sequential', name: 's' } } }],
  ])('rejects non-direct or non-ordinal series: %s', (_name, series) => {
    expect(() => RegressionChartEncodingsSchema.parse({ x: 'sepalLength', y: 'petalLength', series })).toThrow();
  });

  it.each([
    ['sampleCount below minimum', { sampleCount: 1 }],
    ['descending extent', { extent: [8, 1] }],
    ['polynomial order below minimum', { method: { kind: 'polynomial', order: 1 } }],
    ['polynomial order above maximum', { method: { kind: 'polynomial', order: 7 } }],
    ['unknown method', { method: { kind: 'loess' } }],
    ['unknown property', { confidence: true }],
    ['trend fill', { trend: { fill: '#fff' } }],
    ['trend curve', { trend: { curve: 'basis' } }],
    ['trend closed', { trend: { closed: true } }],
    ['trend transform', { trend: { transform: [] } }],
  ])('rejects invalid properties: %s', (_name, properties) => {
    expect(() => RegressionChartPropertiesSchema.parse(properties)).toThrow();
  });

  it('keeps position domain padding recipe-only', () => {
    expect(RegressionChartPropertiesSchema.parse({ domainPadding: { x: 0.03, y: 0.05 } })).toEqual({
      domainPadding: { x: 0.03, y: 0.05 },
    });
    expect(
      RegressionChartMarkSchema.safeParse({ kind: 'regression', properties: { domainPadding: 0.04 } }).success,
    ).toBe(false);
  });

  it('keeps series recipe-only and rejects unknown nested fields', () => {
    expect(() =>
      RegressionChartSchema.parse({
        ...minimalSource,
        recipe: {
          ...minimalSource.recipe,
          marks: [{ kind: 'regression', encodings: { series: 'species' } }],
        },
      }),
    ).toThrow();
    expect(() => RegressionChartSchema.parse({ ...minimalSource, resolvedPlot: {} })).toThrow();
    expect(() =>
      RegressionChartSchema.parse({
        ...minimalSource,
        recipe: { ...minimalSource.recipe, unknown: true },
      }),
    ).toThrow();
  });
});
