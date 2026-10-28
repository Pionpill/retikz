import type { IRRegressionMethod } from '@retikz/data';
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

describe('Chart Vanilla 归一化', () => {
  it('标准化坐标字符串简写，同时保留对象配置', () => {
    expect(normalizeChartCoordinate('polar2D')).toEqual({ type: 'polar2D' });
    expect(normalizeChartCoordinate('cartesian2D')).toEqual({ type: 'cartesian2D' });
    expect(normalizeChartCoordinate('arch')).toEqual({ type: 'arch' });
    expect(normalizeChartCoordinate({ type: 'polar2D', innerRadius: 0 })).toEqual({
      type: 'polar2D',
      innerRadius: 0,
    });
    expect(normalizeChartCoordinate(undefined)).toBeUndefined();
  });

  it('对每个点 chartType 的坐标进行一致标准化', () => {
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

  it('将连接散点和范围点标准化为精确源', () => {
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

  it('将气泡输入标准化为其确切的系列和配方 Source', () => {
    const source = normalizeBubbleChart({
      id: 'countries',
      data: { reference: 'rows' },
      title: { text: 'Income and life expectancy' },
      encodings: {
        x: 'income',
        y: 'lifeExpectancy',
        size: 'population',
        column: 'continent',
      },
      properties: {
        opacity: 0.75,
        autoPadding: { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } },
        domainPadding: { kind: 'ratio', default: 0.04, left: 0.02 },
      },
      marks: [{ kind: 'bubble', properties: { strokeWidth: 1 } }],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'countries',
      presentation: { title: { text: 'Income and life expectancy' } },
      data: { reference: 'rows' },
      recipe: {
        chartType: 'bubble',
        encodings: {
          x: 'income',
          y: 'lifeExpectancy',
          size: 'population',
          column: { field: 'continent' },
        },
        properties: {
          opacity: 0.75,
          autoPadding: { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } },
          domainPadding: { kind: 'ratio', default: 0.04, left: 0.02 },
        },
        marks: [{ kind: 'bubble', properties: { strokeWidth: 1 } }],
      },
    });
  });

  it('将 Scatter 输入归一为精简的系列及配方 Source', () => {
    const source = normalizeScatterChart({
      id: 'sales',
      data: { reference: 'rows' },
      layout: { width: 640, height: 360 },
      title: { text: 'Sales' },
      note: { text: 'Source note' },
      encodings: { x: 'amount', y: 'margin', color: 'region' },
      properties: { opacity: 0, domainPadding: 0.04 },
      marks: [{ kind: 'scatter', properties: { size: 4 } }],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'sales',
      presentation: { title: { text: 'Sales' }, note: { text: 'Source note' } },
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

  it('在 Source 标准化中保留稀疏点配方辅助线控件', () => {
    const scatter = normalizeScatterChart({
      data: { reference: 'rows' },
      encodings: { x: 'x', y: 'y', size: 'size' },
      guides: { axis: false, grid: false, legend: false },
    });
    const strip = normalizeStripChart({
      data: { reference: 'rows' },
      encodings: {
        x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
        y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
      },
      guides: { grid: false },
    });

    expect(scatter.recipe.guides).toEqual({ axis: false, grid: false, legend: false });
    expect(strip.recipe.guides).toEqual({ grid: false });
  });

  it('标准化 Strip 输入，不会丢失零抖动值或空标记', () => {
    const source = normalizeStripChart({
      id: 'distribution',
      data: { reference: 'rows' },
      coordinate: { type: 'polar2D', innerRadius: 0, startAngle: 0, endAngle: 360 },
      encodings: {
        x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
        y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
      },
      properties: {
        size: 0,
        jitter: { span: 0, seed: 0, distribution: { kind: 'normal', sigma: 0.5 } },
        domainPadding: 0,
      },
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
        properties: {
          size: 0,
          jitter: { span: 0, seed: 0, distribution: { kind: 'normal', sigma: 0.5 } },
          domainPadding: 0,
        },
        marks: [],
      },
    });
  });

  it('无论编写属性顺序如何，都将演示文稿保留在固定槽中', () => {
    const source = normalizeScatterChart({
      data: { reference: 'rows' },
      source: 'World Bank',
      subtitle: '2023',
      title: 'Income',
      encodings: { x: 'income', y: 'life' },
    });

    expect(Object.keys(source.presentation ?? {})).toEqual(['title', 'subtitle', 'source']);
  });

  it('规范化点配方而不暴露类型选择器或配置', () => {
    const source = normalizeScatterChart({ data: { reference: 'rows' }, encodings: { x: 'x', y: 'y' } });

    expect(source).toMatchObject({ namespace: 'chart', type: 'point', recipe: { chartType: 'scatter' } });
    expect(source).not.toHaveProperty('config');
  });

  it('在精确的分散编码内标准化行和列字符串简写', () => {
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

  it('将回归输入标准化为其精确的 Source 并保留直接序列映射', () => {
    const source = normalizeRegressionChart({
      id: 'iris-regression',
      data: { reference: 'iris.rows' },
      title: { text: 'Iris regression' },
      encodings: {
        x: 'sepalLengthCm',
        y: 'petalLengthCm',
        series: { field: 'species', scale: { operation: { type: 'ordinal', name: 'speciesScale' } } },
        row: 'collection',
        column: [{ field: 'site', order: ['north', 'south'] }],
      },
      properties: {
        method: { kind: 'polynomial', order: 4 },
        extraMethods: [{ method: { kind: 'linear' }, sampleCount: 10, trend: { stroke: '#f00' } }],
        sampleCount: 32,
        extent: [1, 8],
        point: { opacity: 0.6, size: 5 },
        trend: { strokeWidth: 2, dashPattern: [4, 2] },
      },
      marks: [
        {
          kind: 'regression',
          hidePoints: true,
          encodings: { y: 'petalWidthCm' },
          properties: { method: { kind: 'quadratic' }, trend: { opacity: { stroke: 0.75 } } },
        },
      ],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'iris-regression',
      presentation: { title: { text: 'Iris regression' } },
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
          extraMethods: [{ method: { kind: 'linear' }, sampleCount: 10, trend: { stroke: '#f00' } }],
          sampleCount: 32,
          extent: [1, 8],
          point: { opacity: 0.6, size: 5 },
          trend: { strokeWidth: 2, dashPattern: [4, 2] },
        },
        marks: [
          {
            kind: 'regression',
            hidePoints: true,
            encodings: { y: 'petalWidthCm' },
            properties: { method: { kind: 'quadratic' }, trend: { opacity: { stroke: 0.75 } } },
          },
        ],
      },
    });
    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });

  const methods: Array<IRRegressionMethod> = [
    { kind: 'linear' },
    { kind: 'quadratic' },
    { kind: 'polynomial', order: 6 },
    { kind: 'logarithmic' },
    { kind: 'exponential' },
    { kind: 'power' },
  ];
  it.each(methods)('保留 $kind 回归方法，无需适配器调度', method => {
    const source = normalizeRegressionChart({
      data: { reference: 'rows' },
      encodings: { x: 'x', y: 'y' },
      properties: { method },
    });

    expect(source.recipe.properties?.method).toEqual(method);
  });
});
