import { describe, expect, it } from 'vitest';

import { normalizeChartCoordinate } from '../src';
import {
  normalizeBubbleChart,
  normalizeConnectedScatterChart,
  normalizeRangedDotChart,
  normalizeRegressionChart,
  normalizeScatterChart,
  normalizeStripChart,
} from '../src/point';

describe('Chart Vanilla normalization', () => {
  it('normalizes coordinate string shorthand while preserving object configuration', () => {
    expect(normalizeChartCoordinate('polar2D')).toEqual({ type: 'polar2D' });
    expect(normalizeChartCoordinate('cartesian2D')).toEqual({ type: 'cartesian2D' });
    expect(normalizeChartCoordinate('arch')).toEqual({ type: 'arch' });
    expect(normalizeChartCoordinate({ type: 'polar2D', innerRadius: 0 })).toEqual({
      type: 'polar2D',
      innerRadius: 0,
    });
    expect(normalizeChartCoordinate(undefined)).toBeUndefined();
  });

  it('normalizes coordinate consistently for every Point chartType', () => {
    expect(
      normalizeBubbleChart({
        data: { reference: 'rows' },
        coordinate: 'polar2D',
        encodings: { x: 'x', y: 'y', size: 'size' },
      }).coordinate,
    ).toMatchObject({ type: 'polar2D' });
    expect(
      normalizeConnectedScatterChart({
        data: { reference: 'rows' },
        coordinate: 'polar2D',
        encodings: { x: 'x', y: 'y', order: 'order' },
      }).coordinate,
    ).toMatchObject({ type: 'polar2D' });
    expect(
      normalizeRangedDotChart({
        data: { reference: 'rows' },
        coordinate: 'polar2D',
        encodings: { category: 'category', start: 'start', end: 'end' },
      }).coordinate,
    ).toMatchObject({ type: 'polar2D' });
    expect(
      normalizeRegressionChart({
        data: { reference: 'rows' },
        coordinate: 'polar2D',
        encodings: { x: 'x', y: 'y' },
      }).coordinate,
    ).toMatchObject({ type: 'polar2D' });
    expect(
      normalizeScatterChart({
        data: { reference: 'rows' },
        coordinate: 'polar2D',
        encodings: { x: 'x', y: 'y' },
      }).coordinate,
    ).toMatchObject({ type: 'polar2D' });
    expect(
      normalizeStripChart({
        data: { reference: 'rows' },
        coordinate: 'polar2D',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
      }).coordinate,
    ).toMatchObject({ type: 'polar2D' });
    expect(normalizeScatterChart({ data: { reference: 'rows' }, encodings: { x: 'x', y: 'y' } })).not.toHaveProperty(
      'coordinate',
    );
  });

  it('normalizes Connected Scatter and Ranged Dot to exact Sources', () => {
    expect(
      normalizeConnectedScatterChart({
        data: { reference: 'rows' },
        encodings: { x: 'x', y: 'y', order: 'year', series: 'country', row: 'region' },
      }).recipe,
    ).toEqual({
      chartType: 'connected-scatter',
      encodings: { x: 'x', y: 'y', order: 'year', series: 'country', row: { field: 'region' } },
    });
    expect(
      normalizeRangedDotChart({
        data: { reference: 'rows' },
        encodings: { category: 'country', start: 'before', end: 'after' },
        properties: { endPoint: { shape: 'diamond' } },
      }).recipe,
    ).toEqual({
      chartType: 'ranged-dot',
      encodings: { category: 'country', start: 'before', end: 'after' },
      properties: { endPoint: { shape: 'diamond' } },
    });
  });
  it('normalizes Bubble input to its exact family and recipe Source', () => {
    const source = normalizeBubbleChart({
      id: 'countries',
      data: { reference: 'rows' },
      title: 'Income and life expectancy',
      encodings: {
        x: 'income',
        y: 'lifeExpectancy',
        size: 'population',
        column: 'continent',
      },
      properties: { opacity: 0.75, domainPadding: { kind: 'ratio', default: 0.04, left: 0.02 } },
      marks: [{ kind: 'bubble', properties: { strokeWidth: 1 } }],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'countries',
      presentation: { title: 'Income and life expectancy' },
      data: { reference: 'rows' },
      recipe: {
        chartType: 'bubble',
        encodings: {
          x: 'income',
          y: 'lifeExpectancy',
          size: 'population',
          column: { field: 'continent' },
        },
        properties: { opacity: 0.75, domainPadding: { kind: 'ratio', default: 0.04, left: 0.02 } },
        marks: [{ kind: 'bubble', properties: { strokeWidth: 1 } }],
      },
    });
  });

  it('normalizes Scatter input to a concise family and recipe Source', () => {
    const source = normalizeScatterChart({
      id: 'sales',
      data: { reference: 'rows' },
      layout: { width: 640, height: 360 },
      title: 'Sales',
      note: 'Source note',
      encodings: { x: 'amount', y: 'margin', color: 'region' },
      properties: { opacity: 0, domainPadding: 0.04 },
      marks: [{ kind: 'scatter', properties: { size: 4 } }],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'sales',
      presentation: { title: 'Sales', note: 'Source note' },
      data: { reference: 'rows' },
      layout: { width: 640, height: 360 },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'amount', y: 'margin', color: 'region' },
        properties: { opacity: 0, domainPadding: 0.04 },
        marks: [{ kind: 'scatter', properties: { size: 4 } }],
      },
    });
  });

  it('normalizes Strip input without losing zero jitter values or empty marks', () => {
    const source = normalizeStripChart({
      id: 'distribution',
      data: { reference: 'rows' },
      coordinate: { type: 'polar2D', innerRadius: 0, startAngle: 0, endAngle: 360 },
      encodings: {
        x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
        y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
      },
      properties: { size: 0, jitter: { span: 0, seed: 0 }, domainPadding: 0 },
      marks: [],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'distribution',
      data: { reference: 'rows' },
      coordinate: { type: 'polar2D', innerRadius: 0, startAngle: 0, endAngle: 360 },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        properties: { size: 0, jitter: { span: 0, seed: 0 }, domainPadding: 0 },
        marks: [],
      },
    });
  });

  it('keeps presentation in fixed slots regardless of authoring property order', () => {
    const source = normalizeScatterChart({
      data: { reference: 'rows' },
      source: 'World Bank',
      subtitle: '2023',
      title: 'Income',
      encodings: { x: 'income', y: 'life' },
    });

    expect(Object.keys(source.presentation ?? {})).toEqual(['title', 'subtitle', 'source']);
  });

  it('normalizes a Point recipe without exposing a type selector or config', () => {
    const source = normalizeScatterChart({ data: { reference: 'rows' }, encodings: { x: 'x', y: 'y' } });

    expect(source).toMatchObject({ namespace: 'chart', type: 'point', recipe: { chartType: 'scatter' } });
    expect(source).not.toHaveProperty('config');
  });

  it('normalizes row and column string shorthand inside exact Scatter encodings', () => {
    const source = normalizeScatterChart({
      data: { reference: 'rows' },
      encodings: {
        x: 'amount',
        y: 'margin',
        row: 'channel',
        column: [{ field: 'region', order: ['north', 'south'] }],
        facet: {
          spacing: { panelGap: 12 },
        },
      },
    });

    expect(source.recipe.encodings).toMatchObject({
      row: { field: 'channel' },
      column: [{ field: 'region', order: ['north', 'south'] }],
      facet: {
        spacing: { panelGap: 12 },
      },
    });
    expect(source.recipe).not.toHaveProperty('facet');
  });

  it('normalizes Regression input to its exact Source and preserves direct series mapping', () => {
    const source = normalizeRegressionChart({
      id: 'iris-regression',
      data: { reference: 'iris.rows' },
      title: 'Iris regression',
      encodings: {
        x: 'sepalLengthCm',
        y: 'petalLengthCm',
        series: { field: 'species', scale: { operation: { type: 'ordinal', name: 'speciesScale' } } },
        row: 'collection',
        column: [{ field: 'site', order: ['north', 'south'] }],
      },
      properties: {
        method: { kind: 'polynomial', order: 4 },
        sampleCount: 32,
        extent: [1, 8],
        point: { opacity: 0.6, size: 5 },
        trend: { strokeWidth: 2, dashPattern: [4, 2] },
      },
      marks: [
        {
          kind: 'regression',
          encodings: { y: 'petalWidthCm' },
          properties: { method: { kind: 'quadratic' }, trend: { strokeOpacity: 0.75 } },
        },
      ],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'iris-regression',
      presentation: { title: 'Iris regression' },
      data: { reference: 'iris.rows' },
      recipe: {
        chartType: 'regression',
        encodings: {
          x: 'sepalLengthCm',
          y: 'petalLengthCm',
          series: { field: 'species', scale: { operation: { type: 'ordinal', name: 'speciesScale' } } },
          row: { field: 'collection' },
          column: [{ field: 'site', order: ['north', 'south'] }],
        },
        properties: {
          method: { kind: 'polynomial', order: 4 },
          sampleCount: 32,
          extent: [1, 8],
          point: { opacity: 0.6, size: 5 },
          trend: { strokeWidth: 2, dashPattern: [4, 2] },
        },
        marks: [
          {
            kind: 'regression',
            encodings: { y: 'petalWidthCm' },
            properties: { method: { kind: 'quadratic' }, trend: { strokeOpacity: 0.75 } },
          },
        ],
      },
    });
    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });

  it.each([
    { kind: 'linear' },
    { kind: 'quadratic' },
    { kind: 'polynomial', order: 6 },
    { kind: 'logarithmic' },
    { kind: 'exponential' },
    { kind: 'power' },
  ] as const)('preserves the $kind Regression method without adapter dispatch', method => {
    const source = normalizeRegressionChart({
      data: { reference: 'rows' },
      encodings: { x: 'x', y: 'y' },
      properties: { method },
    });

    expect(source.recipe.properties?.method).toEqual(method);
  });
});
