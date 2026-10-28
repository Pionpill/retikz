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

describe('回归精确的 Source schema', () => {
  it('通过 JSON 保留有序的额外方法和省略的继承字段', () => {
    const properties = {
      extraMethods: [
        { method: { kind: 'linear' } },
        { method: { kind: 'quadratic' }, extent: [1, 3], sampleCount: 8, trend: { stroke: '#f00' } },
      ],
    };

    expect(RegressionChartPropertiesSchema.parse(JSON.parse(JSON.stringify(properties)))).toEqual(properties);
    expect(RegressionChartPropertiesSchema.parse({ extraMethods: [] })).toEqual({ extraMethods: [] });
  });

  it.each([{}, { method: { kind: 'linear' }, point: {} }, { method: { kind: 'linear' }, extraMethods: [] }])(
    '拒绝不完整或不相关的额外方法字段',
    entry => {
      expect(RegressionChartPropertiesSchema.safeParse({ extraMethods: [entry] }).success).toBe(false);
    },
  );

  it('在其条目中找到无效的附加范围', () => {
    const result = RegressionChartPropertiesSchema.safeParse({
      extraMethods: [{ method: { kind: 'linear' }, extent: [3, 1] }],
    });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].path).toEqual(['extraMethods', 0, 'extent']);
  });

  it('接受最小 Source，而不实现运行时默认值', () => {
    expect(RegressionChartSchema.parse(minimalSource)).toEqual(minimalSource);
  });

  it('接受完整的 JSON 形式并保留往返相等', () => {
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
            opacity: { stroke: 0.8, overall: 0.9 },
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
            hidePoints: false,
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
  ])('拒绝 %s', (_name, encodings) => {
    expect(() => RegressionChartEncodingsSchema.parse(encodings)).toThrow();
  });

  it.each([
    ['aggregate series', { aggregate: { kind: 'count', as: 'count' } }],
    [
      'derived series',
      { transform: { operation: { kind: 'normalize', params: { field: 'species' } } }, output: 'species' },
    ],
    ['constant series', 3],
    ['sequential series scale', { field: 'species', scale: { operation: { type: 'sequential', name: 's' } } }],
  ])('拒绝非直接或非序数系列：%s', (_name, series) => {
    expect(() => RegressionChartEncodingsSchema.parse({ x: 'sepalLength', y: 'petalLength', series })).toThrow();
  });

  it.each([
    ['sampleCount below minimum', { sampleCount: 1 }],
    ['descending extent', { extent: [8, 1] }],
    ['unknown property', { confidence: true }],
    ['trend fill', { trend: { fill: '#fff' } }],
    ['trend closed', { trend: { closed: true } }],
    ['trend transform', { trend: { transform: [] } }],
  ])('拒绝无效属性：%s', (_name, properties) => {
    expect(() => RegressionChartPropertiesSchema.parse(properties)).toThrow();
  });

  it('仅保留位置域填充配方', () => {
    expect(
      RegressionChartPropertiesSchema.parse({
        domainPadding: { kind: 'ratio', default: 0.04, top: 0.02 },
      }),
    ).toEqual({
      domainPadding: { kind: 'ratio', default: 0.04, top: 0.02 },
    });
    expect(
      RegressionChartMarkSchema.safeParse({ kind: 'regression', properties: { domainPadding: 0.04 } }).success,
    ).toBe(false);
  });

  it('仅保留系列配方并拒绝未知的嵌套字段', () => {
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
