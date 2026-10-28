import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import type { IRChild, IRNode, IRScope } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { IRPlotMark, IRPlotScaleOperation } from '@retikz/plot';
import { defineScale, PathMarkSchema, PositionScaleContinuity, lowerPlotWithLineage } from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type {
  ChartEncodingRuntime,
  ChartRecipeDefinition,
  ChartScaleDefaultsResolveContext,
} from '../../src/_chart/contract';
import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import type { IRChartSource } from '../../src/_chart/schemas';
import { bubbleMarkDefinition } from '../../src/point/bubble/mark';
import { bubbleChartDefinition } from '../../src/point/bubble/recipe';
import { BubbleChartSchema } from '../../src/point/bubble/schema';
import { connectedScatterChartDefinition } from '../../src/point/connected-scatter/recipe';
import { ConnectedScatterChartSchema } from '../../src/point/connected-scatter/schema';
import { rangedDotChartDefinition } from '../../src/point/ranged-dot/recipe';
import { RangedDotChartSchema } from '../../src/point/ranged-dot/schema';
import { regressionChartDefinition } from '../../src/point/regression/recipe';
import { RegressionChartSchema } from '../../src/point/regression/schema';
import { scatterMarkDefinition } from '../../src/point/scatter/mark';
import { scatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';
import {
  pointFieldConsumersOf,
  pointPositionFieldConsumersOf,
  resolvePointScaleDefaults,
} from '../../src/point/shared';
import { stripChartDefinition } from '../../src/point/strip/recipe';
import { StripChartSchema } from '../../src/point/strip/schema';

const runtime = resolveChartProviderRegistry([
  { family: 'point', recipe: scatterChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const bubbleRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: bubbleChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const regressionRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: regressionChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const connectedScatterRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: connectedScatterChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const rangedDotRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: rangedDotChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const stripRuntime = resolveChartProviderRegistry([
  { family: 'point', recipe: stripChartDefinition, chartThemeDefinitions: [] },
]).runtime;

const resolve = <TSource extends IRChartSource>(
  definition: ChartRecipeDefinition<TSource>,
  encodings: JsonObject,
  properties: JsonObject = {},
) =>
  definition.resolve({
    data: { reference: 'rows' },
    encodings,
    properties,
  });

const resolveChart = <TSource extends IRChartSource>(
  source: TSource,
  definition: ChartRecipeDefinition<TSource>,
  activeRuntime: ChartEncodingRuntime,
) =>
  resolveSelectedChart(source, {
    theme: DEFAULT_RESOLVED_THEME,
    recipe: definition,
    chartThemeDefinitions: [],
    runtime: activeRuntime,
  });

const scaleDefaultsContextOf = (
  source: IRChartSource,
  chartMarks: ReadonlyArray<IRPlotMark>,
  scales: ReadonlyArray<IRPlotScaleOperation>,
): ChartScaleDefaultsResolveContext => ({
  identifyMark: index => `__chart.mark.${index}`,
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

describe('点 Chart 配方定义', () => {
  it('在没有角色或重复 Plot 默认值的情况下下沉条带抖动', () => {
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
      },
    });

    const result = resolveChart(source, stripChartDefinition, stripRuntime);

    expect(result.plot.marks).toEqual([
      expect.objectContaining({
        type: 'point',
        properties: expect.objectContaining({ placement: { adjustments: [{ kind: 'jitter' }] } }),
      }),
    ]);
    expect(result.plot.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: false },
      { type: 'axis', dimension: 'y' },
    ]);
  });

  it('使用连续角色移动默认的条带网格并保留显式参考线', () => {
    const horizontal = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
          y: { field: 'category', scale: { operation: { type: 'band', name: 'category' } } },
        },
      },
    });
    const explicit = StripChartSchema.parse({
      ...horizontal,
      plotExtension: { guides: [{ type: 'axis', dimension: 'y', grid: true }] },
    });
    const forcedGrid = StripChartSchema.parse({
      ...horizontal,
      recipe: { ...horizontal.recipe, guides: { grid: true } },
    });

    expect(resolveChart(horizontal, stripChartDefinition, stripRuntime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: false },
    ]);
    expect(resolveChart(explicit, stripChartDefinition, stripRuntime).plot.guides).toEqual([
      { type: 'axis', dimension: 'y', grid: true },
    ]);
    expect(resolveChart(forcedGrid, stripChartDefinition, stripRuntime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: true },
      { type: 'axis', dimension: 'y', grid: false },
    ]);
  });

  it('将稀疏分散配方辅助线控件应用于解析的 Plot', () => {
    const themed = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
    });
    const forcedGrid = ScatterChartSchema.parse({
      ...themed,
      recipe: { ...themed.recipe, guides: { grid: true } },
    });
    const hidden = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y', size: 'size' },
        guides: { axis: false, grid: false, legend: false },
      },
    });
    const noGridOrLegend = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y', size: 'size' },
        guides: { grid: false, legend: false },
      },
    });

    expect(resolveChart(themed, scatterChartDefinition, runtime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ]);
    expect(resolveChart(forcedGrid, scatterChartDefinition, runtime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
    expect(hidden.recipe.guides).toEqual({ axis: false, grid: false, legend: false });
    expect(resolveChart(hidden, scatterChartDefinition, runtime).plot.guides).toEqual([]);
    expect(resolveChart(noGridOrLegend, scatterChartDefinition, runtime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: false },
      { type: 'axis', dimension: 'y', grid: false },
    ]);
  });

  it('将默认网格移动到连续角色后应用稀疏条形网格控件', () => {
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        guides: { grid: false },
      },
    });

    expect(source.recipe.guides).toEqual({ grid: false });
    expect(resolveChart(source, stripChartDefinition, stripRuntime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: false },
      { type: 'axis', dimension: 'y', grid: false },
    ]);
  });

  it('正好需要一个离散的和一个连续的条带位置标尺', () => {
    const sourceWith = (xType: 'band' | 'linear' | 'point', yType: 'band' | 'linear' | 'point') =>
      StripChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'strip',
          encodings: {
            x: { field: 'x', scale: { operation: { type: xType, name: 'x' } } },
            y: { field: 'y', scale: { operation: { type: yType, name: 'y' } } },
          },
        },
      });

    expect(() => resolveChart(sourceWith('linear', 'linear'), stripChartDefinition, stripRuntime)).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings'] }) }),
    );
    expect(() => resolveChart(sourceWith('point', 'band'), stripChartDefinition, stripRuntime)).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings'] }) }),
    );
  });

  it('使用自定义缩放 Definition 连续性而不是内置缩放白名单', () => {
    const customDiscreteScale = defineScale({
      family: 'position',
      continuity: PositionScaleContinuity.Discrete,
      schema: strictObject({ type: literal('custom-discrete'), name: string().min(1) }),
      isFieldCompatible: () => true,
      resolve: () => {
        throw new Error('Chart resolution must not execute custom scale geometry');
      },
    });
    const customRuntime = resolveChartProviderRegistry([
      {
        family: 'point',
        recipe: stripChartDefinition,
        chartThemeDefinitions: [],
        runtimeDefinitions: { scales: [customDiscreteScale] },
      },
    ]).runtime;
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: {
            field: 'category',
            scale: { operation: { type: 'custom-discrete', name: 'category' } },
          },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
      },
    });

    expect(resolveChart(source, stripChartDefinition, customRuntime).plot.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: false },
      { type: 'axis', dimension: 'y' },
    ]);
  });

  it('继承 Strip 点和抖动槽，同时保留编写标记仅限现场', () => {
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        properties: { size: 7, jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 3 } },
        marks: [
          {
            kind: 'strip',
            override: true,
            encodings: { x: 'alternateCategory' },
            properties: { jitter: { span: 0, seed: 0 } },
          },
          { kind: 'strip', properties: { opacity: 0.4 } },
        ],
      },
    });

    const result = resolveChart(source, stripChartDefinition, stripRuntime);

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks[0]).toMatchObject({
      encodings: { position: { x: { field: 'alternateCategory' }, y: { field: 'value' } } },
      properties: { size: 7, placement: { adjustments: [{ kind: 'jitter', span: 0, seed: 0 }] } },
    });
    expect(result.plot.marks[1]).toMatchObject({
      properties: {
        size: 7,
        placement: { adjustments: [{ kind: 'jitter', span: { kind: 'ratio', value: 0.5 }, seed: 3 }] },
        opacity: { overall: 0.4 },
      },
    });
  });

  it('仅将点域填充应用于连续的条带比例', () => {
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'band', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        properties: { size: 6, domainPadding: 12 },
      },
    });

    expect(resolveChart(source, stripChartDefinition, stripRuntime).plot.scales).toEqual([
      { type: 'band', name: 'category' },
      {
        type: 'linear',
        name: 'value',
        domainPadding: 12,
      },
    ]);
  });

  it('点图转发配方默认值，没有派生的比例填充', () => {
    const scatter = resolveChart(
      ScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
      }),
      scatterChartDefinition,
      runtime,
    );
    const bubble = resolveChart(
      BubbleChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'bubble', encodings: { x: 'x', y: 'y', size: 'size' } },
      }),
      bubbleChartDefinition,
      bubbleRuntime,
    );
    const regression = resolveChart(
      RegressionChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y' } },
      }),
      regressionChartDefinition,
      regressionRuntime,
    );
    const connectedScatter = resolveChart(
      ConnectedScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'connected-scatter', encodings: { x: 'x', y: 'y', order: 'order' } },
      }),
      connectedScatterChartDefinition,
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
      rangedDotChartDefinition,
      rangedDotRuntime,
    );

    for (const chart of [scatter, regression, connectedScatter, rangedDot]) {
      expect(chart.plot.marks.find(mark => mark.type === 'point')).toMatchObject({
        properties: { autoPadding: 'max-radius' },
      });
      expect(chart.plot.scales.every(scale => !Object.hasOwn(scale, 'domainPadding'))).toBe(true);
    }
    expect(bubble.plot.marks[0]).toMatchObject({ properties: { autoPadding: 'point-aware' } });
    expect(bubble.plot.scales.every(scale => !Object.hasOwn(scale, 'domainPadding'))).toBe(true);
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
  ])('转发 %s 的尺寸源', (_name, recipeOptions, radius) => {
    const options = recipeOptions as {
      properties?: JsonObject;
      encodings?: JsonObject;
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

    const result = resolveChart(source, scatterChartDefinition, runtime);

    expect(result.plot.marks[0]).toMatchObject({ properties: { autoPadding: 'max-radius' } });
    if (options.properties !== undefined) {
      expect(result.plot.marks[0]).toMatchObject({ properties: { size: radius } });
    } else {
      expect(result.plot.marks[0]).toMatchObject({ encodings: { size: { field: 'size', scale: 'sizeScale' } } });
      expect(result.plot.scales).toContainEqual(
        expect.objectContaining({ name: 'sizeScale', range: expect.arrayContaining([radius]) }),
      );
    }
  });

  it('保留添加和原子覆盖，而扩展保留 Plot 默认值', () => {
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
            encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
            properties: { size: 99 },
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

    const additionResult = resolveChart(addition, scatterChartDefinition, runtime);
    const overrideResult = resolveChart(override, scatterChartDefinition, runtime);

    expect(additionResult.plot.marks).toMatchObject([
      { properties: { size: 3, autoPadding: 'max-radius' } },
      { properties: { size: 12, autoPadding: 'max-radius' } },
      { properties: { size: 99, autoPadding: 'max-radius' } },
    ]);
    expect(overrideResult.plot.marks).toMatchObject([{ properties: { size: 4, autoPadding: 'max-radius' } }]);
    expect(overrideResult.plot.marks).toHaveLength(1);
  });

  it('使用引用的 Plot 扩展 sqrt 比例来确定最大点半径', () => {
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

    const result = resolveChart(source, scatterChartDefinition, runtime);

    expect(result.plot.marks[0]).toMatchObject({
      encodings: { size: { field: 'size', scale: 'sizeScale' } },
      properties: { autoPadding: 'max-radius' },
    });
    expect(result.plot.scales).toContainEqual({ type: 'sqrt', name: 'sizeScale', range: [3, 17] });
  });

  it('转发复合图表点和两个范围点端点的大小', () => {
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
      regressionChartDefinition,
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
      connectedScatterChartDefinition,
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
      rangedDotChartDefinition,
      rangedDotRuntime,
    );

    expect(regression.plot.marks[0]).toMatchObject({ properties: { autoPadding: 'max-radius', size: 11 } });
    expect(connected.plot.marks.find(mark => mark.type === 'point')).toMatchObject({
      properties: { autoPadding: 'max-radius', size: 14 },
    });
    expect(ranged.plot.marks.filter(mark => mark.type === 'point')).toMatchObject([
      { properties: { autoPadding: 'max-radius', size: 8 } },
      { properties: { autoPadding: 'max-radius', size: 15 } },
    ]);
  });

  it('解决 Core 边优先级、比率间隙和反向笛卡尔范围', () => {
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

    expect(resolveChart(rangeSource, scatterChartDefinition, runtime).plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 2, upper: 8 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 7, upper: 3 } }),
    ]);
    expect(resolveChart(ratioSource, scatterChartDefinition, runtime).plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'ratio', lower: 0.02, upper: 0.1 } }),
      expect.objectContaining({ domainPadding: { kind: 'ratio', lower: 0, upper: 0 } }),
    ]);
    expect(resolveChart(reversedSource, scatterChartDefinition, runtime).plot.scales).toEqual([
      expect.objectContaining({ name: 'xScale', domainPadding: { kind: 'range', lower: 8, upper: 2 } }),
      expect.objectContaining({ name: 'yScale', domainPadding: { kind: 'range', lower: 3, upper: 9 } }),
    ]);
  });

  it('在点默认值之前保留显式比例填充和 Plot 扩展比例所有权', () => {
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

    const result = resolveChart(source, scatterChartDefinition, runtime);

    expect(result.plot.scales).toEqual([
      { type: 'log', name: '__chart.scatter.scale.y' },
      { type: 'linear', name: 'xScale', domainPadding: 0 },
    ]);
  });

  it('允许极坐标下的轴间距，并拒绝笛卡尔坐标外的视觉侧间距', () => {
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

    const result = resolveChart(axisPadding, scatterChartDefinition, runtime);

    expect(result.plot.scales.slice(0, 2)).toEqual([
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 2, upper: 2 } }),
      expect.objectContaining({ domainPadding: { kind: 'range', lower: 3, upper: 3 } }),
    ]);
    expect(() => resolveChart(sidePadding, scatterChartDefinition, runtime)).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'properties', 'domainPadding', 'left'] }),
      }),
    );
  });

  it('拒绝自定义非笛卡尔坐标的视觉侧间距', () => {
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
      [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
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

  it('常规点图保留编写的连续尺度并转发策略', () => {
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
      recipe: scatterChartDefinition,
      chartThemeDefinitions: [],
      runtime,
    });

    expect(result.plot.scales).toContainEqual({
      type: 'log',
      name: 'amountScale',
    });
  });

  it('Connected Scatter 在 Point 之前发出有序的开放 Path', () => {
    const result = resolve(
      connectedScatterChartDefinition,
      { x: 'x', y: 'y', order: 'year' },
      { point: { size: 4 }, path: { strokeWidth: 2, dashPattern: [4, 2], connectNulls: true } },
    );

    expect(result.semanticMarks).toEqual([
      {
        kind: 'connected-scatter',
        plotMarks: [
          expect.objectContaining({
            type: 'path',
            encodings: expect.objectContaining({ order: 'year' }),
            properties: expect.objectContaining({ closed: false, connectNulls: true, dashPattern: [4, 2] }),
          }),
          expect.objectContaining({ type: 'point', properties: expect.objectContaining({ size: 4 }) }),
        ],
      },
    ]);
  });

  it('连接的 Scatter 系列将 Path 分组，并与 Point 共享一个色标', () => {
    const result = resolve(connectedScatterChartDefinition, { x: 'x', y: 'y', order: 'year', series: 'country' });
    const [path, point] = result.semanticMarks[0].plotMarks;

    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'color' });
    expect(path).toMatchObject({
      encodings: { series: 'country', stroke: { field: 'country', scale: '__chart.connected-scatter.scale.series' } },
    });
    expect(point).toMatchObject({
      encodings: { color: { field: 'country', scale: '__chart.connected-scatter.scale.series' } },
    });
  });

  it('连接散点显式点颜色覆盖继承的系列颜色', () => {
    const result = resolve(
      connectedScatterChartDefinition,
      { x: 'x', y: 'y', order: 'year', series: 'country' },
      { point: { color: '#dc2626' }, path: { stroke: '#16a34a' } },
    );
    const [path, point] = result.semanticMarks[0].plotMarks;

    expect(path).toMatchObject({ properties: { stroke: '#16a34a' } });
    expect(point).toMatchObject({ properties: { color: '#dc2626' } });
  });

  it('Ranged Dot emits a connector followed by independently styled endpoint Points', () => {
    const result = resolve(
      rangedDotChartDefinition,
      { category: 'country', start: 'before', end: 'after' },
      {
        point: { size: 4, strokeWidth: 1 },
        startPoint: { color: '#2563eb' },
        endPoint: { color: '#dc2626', shape: 'diamond' },
        range: { stroke: '#64748b', strokeWidth: 2, dashPattern: [4, 2] },
      },
    );
    expect(result.semanticMarks).toHaveLength(1);
    expect(result.semanticMarks[0].plotMarks).toMatchObject([
      {
        type: 'path',
        encodings: {
          from: { x: { field: 'before' }, y: { field: 'country' } },
          to: { x: { field: 'after' }, y: { field: 'country' } },
        },
        properties: { stroke: '#64748b', strokeWidth: 2, dashPattern: [4, 2] },
      },
      {
        type: 'point',
        encodings: { position: { x: { field: 'before' }, y: { field: 'country' } } },
        properties: { color: '#2563eb', size: 4, strokeWidth: 1, autoPadding: 'max-radius' },
      },
      {
        type: 'point',
        encodings: { position: { x: { field: 'after' }, y: { field: 'country' } } },
        properties: { color: '#dc2626', shape: 'diamond', size: 4, strokeWidth: 1, autoPadding: 'max-radius' },
      },
    ]);
  });

  it('范围点在连接器和端点之间共享一种色标', () => {
    const result = resolve(rangedDotChartDefinition, {
      category: 'country',
      start: 'before',
      end: 'after',
      color: 'region',
    });
    const marks = result.semanticMarks[0].plotMarks;

    expect(result.scaffold.scales).toContainEqual({
      value: { type: 'ordinal', name: '__chart.ranged-dot.scale.color' },
      replaceable: true,
    });
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'color' });
    for (const mark of marks)
      expect(mark).toMatchObject({
        encodings: { color: { field: 'region', scale: '__chart.ranged-dot.scale.color' } },
      });
  });

  it('范围点将其未配置的连接器和端点颜色委托给 Plot 调色板', () => {
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
      recipe: rangedDotChartDefinition,
      chartThemeDefinitions: [],
      runtime: rangedDotRuntime,
    });

    expect(result.plot.marks).toEqual([
      expect.objectContaining({ type: 'path', defaultColorGroup: '__chart.default-color.0' }),
      expect.objectContaining({ type: 'point', defaultColorGroup: '__chart.default-color.0' }),
      expect.objectContaining({ type: 'point', defaultColorGroup: '__chart.default-color.0' }),
    ]);
    expect(JSON.stringify(result.plot.marks)).not.toContain('currentColor');
  });

  it('范围点将一个编写的 x 刻度连接到起点和终点', () => {
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
      recipe: rangedDotChartDefinition,
      chartThemeDefinitions: [],
      runtime: rangedDotRuntime,
    });

    expect(result.plot.scales.map(scale => scale.name)).toEqual(['__chart.ranged-dot.scale.y', 'rangeScale']);
    expect(result.plot.coordinate).toMatchObject({ x: 'rangeScale', y: '__chart.ranged-dot.scale.y' });
  });

  it('范围点覆盖替换完整的语义组并保留编写的开始/结束角色', () => {
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
      recipe: rangedDotChartDefinition,
      chartThemeDefinitions: [],
      runtime: rangedDotRuntime,
    });

    expect(result.plot.marks).toHaveLength(3);
    expect(result.plot.marks[0]).toMatchObject({
      encodings: {
        from: { x: { field: 'later' }, y: { field: 'category' } },
        to: { x: { field: 'earlier' }, y: { field: 'category' } },
      },
    });
  });

  it('由可重用的 x/y 原子组成未更改的 Point 消费者', () => {
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

  it('将点偏移和标签作为原始标记属性转发一次', () => {
    const result = resolve(scatterChartDefinition, { x: 'x', y: 'y' }, { dx: 3, dy: -2, label: { text: 'A' } });
    const [mark] = result.semanticMarks[0].plotMarks;

    expect(mark).toMatchObject({ properties: { dx: 3, dy: -2, label: { text: 'A' } } });
  });

  it('回归添加有序拟合，无需重复观察，并继承采样和风格', () => {
    const result = resolve(
      regressionChartDefinition,
      { x: 'x', y: 'y' },
      {
        sampleCount: 12,
        extent: [1, 8],
        trend: { strokeWidth: 3, opacity: 0.6 },
        extraMethods: [
          { method: { kind: 'quadratic' } },
          { method: { kind: 'power' }, sampleCount: 20, extent: [2, 6], trend: { opacity: 0.9 } },
        ],
      },
    );
    const marks = result.semanticMarks[0].plotMarks;

    expect(marks.map(mark => mark.type)).toEqual(['point', 'path', 'path', 'path']);
    expect(marks[2]).toMatchObject({
      transforms: [
        {
          operation: expect.objectContaining({
            params: expect.objectContaining({ method: { kind: 'quadratic' }, sampleCount: 12, extent: [1, 8] }),
          }),
        },
      ],
      properties: { strokeWidth: 3, opacity: { overall: 0.6 } },
    });
    expect(marks[3]).toMatchObject({
      transforms: [
        {
          operation: expect.objectContaining({
            params: expect.objectContaining({ method: { kind: 'power' }, sampleCount: 20, extent: [2, 6] }),
          }),
        },
      ],
      properties: { strokeWidth: 3, opacity: { overall: 0.9 } },
    });
  });

  it('回归保留系列拟合，而仅显式额外描边覆盖系列颜色', () => {
    const result = resolve(
      regressionChartDefinition,
      { x: 'x', y: 'y', series: 'species' },
      {
        trend: { stroke: '#f00' },
        extraMethods: [{ method: { kind: 'power' } }, { method: { kind: 'linear' }, trend: { stroke: '#00f' } }],
      },
    );
    const marks = result.semanticMarks[0].plotMarks;

    for (const mark of marks.slice(1))
      expect(mark).toMatchObject({
        transforms: [
          { operation: expect.objectContaining({ params: expect.objectContaining({ groupBy: ['species'] }) }) },
        ],
        encodings: { series: 'species' },
      });

    expect(marks[1]).toMatchObject({
      encodings: { stroke: { field: 'species', scale: '__chart.regression.scale.series' } },
    });
    expect(marks[2]).toMatchObject({
      encodings: { stroke: { field: 'species', scale: '__chart.regression.scale.series' } },
    });
    expect(marks[3]).toMatchObject({ properties: { stroke: '#00f' } });
  });

  it.each([{ extraMethods: undefined }, { extraMethods: [] }, { extraMethods: [{ method: { kind: 'power' } }] }])(
    '回归标记继承或完全替换额外的方法数组：%j',
    ({ extraMethods }) => {
      const source = RegressionChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'regression',
          encodings: { x: 'x', y: 'y' },
          properties: { extraMethods: [{ method: { kind: 'quadratic' } }], trend: { strokeWidth: 2 } },
          marks: [
            {
              kind: 'regression',
              override: true,
              properties: { ...(extraMethods === undefined ? {} : { extraMethods }), trend: { opacity: 0.8 } },
            },
          ],
        },
      });
      const result = resolveChart(source, regressionChartDefinition, regressionRuntime);

      expect(result.plot.marks.map(mark => mark.type)).toEqual(
        extraMethods?.length === 0 ? ['point', 'path'] : ['point', 'path', 'path'],
      );

      if (extraMethods?.length !== 0)
        expect(result.plot.marks[2]).toMatchObject({
          transforms: [
            {
              operation: expect.objectContaining({
                params: expect.objectContaining({ method: extraMethods?.[0].method ?? { kind: 'quadratic' } }),
              }),
            },
          ],
          properties: { strokeWidth: 2, opacity: { overall: 0.8 } },
        });
    },
  );

  it('回归创建一个点加上标记局部平滑 Path 语义组', () => {
    const result = resolve(
      regressionChartDefinition,
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
            encodings: expect.objectContaining({
              position: { x: { field: 'sepalLength' }, y: { field: 'petalLength' } },
            }),
            properties: expect.objectContaining({ size: 4 }),
          }),
          expect.objectContaining({
            type: 'path',
            transforms: [
              {
                operation: {
                  kind: 'smooth',
                  params: {
                    x: 'sepalLength',
                    y: 'petalLength',
                    method: { kind: 'quadratic' },
                    sampleCount: 5,
                    extent: [1, 5],
                    xAs: '__chart.regression.trend.x',
                    yAs: '__chart.regression.trend.y',
                  },
                },
              },
            ],
            encodings: expect.objectContaining({
              order: '__chart.regression.trend.x',
              position: { x: { field: '__chart.regression.trend.x' }, y: { field: '__chart.regression.trend.y' } },
            }),
            properties: expect.objectContaining({ closed: false, strokeWidth: 2 }),
          }),
        ],
      },
    ]);
    expect(result.scaffold.transform).toBeUndefined();
  });

  it('回归将不同的默认调色板组分配给未分组的观察值和趋势', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y' } },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: regressionChartDefinition,
      chartThemeDefinitions: [],
      runtime: regressionRuntime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks.map(mark => mark.defaultColorGroup)).toEqual([
      '__chart.default-color.0.observation',
      '__chart.default-color.0.trend',
    ]);
    expect(JSON.stringify(result.plot.marks)).not.toContain('currentColor');
  });

  it('回归系列保留观察和趋势的一个共享的字段颜色标识', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y', series: 'species' } },
    });
    const result = resolveSelectedChart(source, {
      theme: DEFAULT_RESOLVED_THEME,
      recipe: regressionChartDefinition,
      chartThemeDefinitions: [],
      runtime: regressionRuntime,
    });
    const [point, path] = result.plot.marks;

    expect(result.plot.marks.map(mark => mark.defaultColorGroup)).toEqual([
      '__chart.default-color.0',
      '__chart.default-color.0',
    ]);
    expect(point).toMatchObject({
      encodings: { color: { field: 'species', scale: '__chart.regression.scale.series' } },
    });
    expect(path).toMatchObject({
      encodings: { stroke: { field: 'species', scale: '__chart.regression.scale.series' } },
    });
  });

  it('连接散点图分配一个默认颜色组，没有恒定的颜色回退', () => {
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
      recipe: connectedScatterChartDefinition,
      chartThemeDefinitions: [],
      runtime: connectedScatterRuntime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks.map(mark => mark.defaultColorGroup)).toEqual([
      '__chart.default-color.0',
      '__chart.default-color.0',
    ]);
    expect(JSON.stringify(result.plot.marks)).not.toContain('currentColor');
  });

  it('回归系列驱动一个共享序数标识、Smooth groupBy 和默认图例', () => {
    const scale = '__chart.regression.scale.series';
    const result = resolve(regressionChartDefinition, {
      x: 'sepalLength',
      y: 'petalLength',
      series: { field: 'species', scale },
    });
    const [point, path] = result.semanticMarks[0].plotMarks;

    expect(result.scaffold.scales).toContainEqual({ value: { type: 'ordinal', name: scale }, replaceable: true });
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'color' });
    expect(point).toMatchObject({
      encodings: { color: { field: 'species', scale: '__chart.regression.scale.series' } },
    });
    expect(path).toMatchObject({
      transforms: [
        {
          operation: expect.objectContaining({
            kind: 'smooth',
            params: expect.objectContaining({ groupBy: ['species'] }),
          }),
        },
      ],
      encodings: { series: 'species', stroke: { field: 'species', scale: '__chart.regression.scale.series' } },
    });
  });

  it('回归编写的附加和覆盖保留完整的组和深度合并嵌套属性', () => {
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
      recipe: regressionChartDefinition,
      chartThemeDefinitions: [],
      runtime: regressionRuntime,
    });

    expect(result.plot.marks).toHaveLength(4);
    expect(result.plot.marks[0]).toMatchObject({
      encodings: {
        position: { x: { field: 'x2' }, y: { field: 'y' } },
        color: { field: 'series', scale: '__chart.regression.scale.series' },
      },
      properties: { size: 5, opacity: { overall: 0.4 } },
    });
    expect(result.plot.marks[1]).toMatchObject({
      transforms: [
        {
          operation: expect.objectContaining({
            params: expect.objectContaining({
              x: 'x2',
              y: 'y',
              method: { kind: 'polynomial', order: 2 },
              sampleCount: 10,
              groupBy: ['series'],
            }),
          }),
        },
      ],
      properties: { strokeWidth: 4, opacity: { overall: 0.6 } },
    });
    expect(result.plot.marks[2]).toMatchObject({ properties: { size: 3, opacity: { overall: 0.4 } } });
    expect(result.plot.marks[3]).toMatchObject({ properties: { strokeWidth: 2, opacity: { overall: 0.8 } } });
  });

  it('回归仅用编写的序数尺度替换其系列回退', () => {
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
      recipe: regressionChartDefinition,
      chartThemeDefinitions: [],
      runtime: regressionRuntime,
    });

    expect(result.plot.scales.map(scale => scale.name)).toEqual([
      '__chart.regression.scale.x',
      '__chart.regression.scale.y',
      'authoredSeries',
    ]);
    expect(result.plot.marks[0]).toMatchObject({ encodings: { color: { field: 'series', scale: 'authoredSeries' } } });
    expect(result.plot.marks[1]).toMatchObject({ encodings: { stroke: { field: 'series', scale: 'authoredSeries' } } });
  });

  it('Bubble 创建具有继承大小和默认大小图例的 Point 语义标记', () => {
    const result = resolve(bubbleChartDefinition, {
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
            encodings: expect.objectContaining({
              position: { x: { field: 'income' }, y: { field: 'lifeExpectancy' } },
              size: 'population',
            }),
            properties: expect.objectContaining({ strokeWidth: 1, opacity: { fill: 0.7 } }),
          }),
        ],
      }),
    ]);
    expect(result.scaffold.guides?.value).toContainEqual({ type: 'legend', channel: 'size' });
  });

  it('Bubble 将位置 padding 传至显式连续比例尺，除非已明确覆盖', () => {
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
      recipe: bubbleChartDefinition,
      chartThemeDefinitions: [],
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

  it('将核心尺寸映射保留在普通并覆盖气泡标记上', () => {
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
      recipe: bubbleChartDefinition,
      chartThemeDefinitions: [],
      runtime: bubbleRuntime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks[0]).toMatchObject({
      encodings: { size: 'population' },
      properties: { strokeWidth: 1, opacity: { fill: 0.7 } },
    });
    expect(result.plot.marks[1]).toMatchObject({
      encodings: { size: 'population' },
      properties: { strokeWidth: 1, opacity: { fill: 0.7 } },
    });
  });

  it('Scatter 创建点语义标记和笛卡尔支架', () => {
    const result = resolve(scatterChartDefinition, { x: 'amount', y: 'margin', size: 'weight' });

    expect(result.semanticMarks).toHaveLength(1);
    expect(result.semanticMarks[0]).toMatchObject({
      kind: 'scatter',
      plotMarks: [
        { type: 'point', encodings: { position: { x: { field: 'amount' }, y: { field: 'margin' } }, size: 'weight' } },
      ],
    });
    expect(result.scaffold.spatial).toMatchObject({ coordinate: { type: 'cartesian2D' } });
  });

  it('保持显式 Plot Path 独立于分散槽', () => {
    const path = PathMarkSchema.parse({
      type: 'path',
      encodings: { order: 'path-order', position: { x: { field: 'path-x' }, y: { field: 'path-y' } } },
      properties: { stroke: '#2563eb' },
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
      recipe: scatterChartDefinition,
      chartThemeDefinitions: [],
      runtime,
    });

    expect(result.plot.marks).toHaveLength(2);
    expect(result.plot.marks[1]).toEqual(path);
  });
});

describe('点 Chart 标记', () => {
  it('当另一个属性显式时，气泡标记继承配方尺寸', () => {
    const result = bubbleMarkDefinition.resolve({
      chartType: 'bubble',
      source: { kind: 'bubble', properties: { opacity: 0.5 } },
      inherited: {
        encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        properties: {},
      },
    });

    expect(result.marks[0]).toMatchObject({
      encodings: { size: 'population' },
      properties: { strokeWidth: 1, opacity: { overall: 0.5, fill: 0.7 } },
    });
  });

  it('气泡标记允许显式外观覆盖其默认值', () => {
    const result = bubbleMarkDefinition.resolve({
      chartType: 'bubble',
      source: {
        kind: 'bubble',
        properties: { opacity: { fill: 0.9 }, stroke: '#0f172a', strokeWidth: 2 },
      },
      inherited: {
        encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        properties: {},
      },
    });

    expect(result.marks[0]).toMatchObject({
      properties: { stroke: '#0f172a', strokeWidth: 2, opacity: { fill: 0.9 } },
    });
  });

  it('散点标记继承 x/y 并让显式属性覆盖继承的值', () => {
    const result = scatterMarkDefinition.resolve({
      chartType: 'scatter',
      source: { kind: 'scatter', properties: { opacity: 0 } },
      inherited: {
        encodings: { x: 'amount', y: 'margin', opacity: 'opacityField' },
        properties: { opacity: 0.5 },
      },
    });

    expect(result.marks[0]).toMatchObject({
      type: 'point',
      encodings: { position: { x: { field: 'amount' }, y: { field: 'margin' } } },
      properties: { opacity: { overall: 0 } },
    });
  });

  it('让显式标记编码覆盖继承的编码和显式属性', () => {
    const result = scatterMarkDefinition.resolve({
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
    });

    expect(result.marks[0]).toMatchObject({ encodings: { opacity: { overall: 'explicitOpacity' } } });
  });
});

describe('点 autoPadding 策略', () => {
  it('通过公共 Plot 入口点编译转发策略', () => {
    const positions = (children: Array<IRChild>): Array<IRNode['position']> =>
      children.flatMap(child => {
        if (child.type === 'scope') return positions((child as IRScope).children);
        if (child.type === 'node') return [(child as IRNode).position];
        return [];
      });
    const data = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    for (const autoPadding of [false, 'max-radius', 'point-aware'] as const) {
      const source = ScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' }, properties: { size: 10, autoPadding } },
      });
      const plot = resolveChart(source, scatterChartDefinition, runtime).plot;
      const result = lowerPlotWithLineage(
        { ...plot, width: 200, height: 200, guides: [] },
        { rows: data },
        { environment: {} },
      );
      const points = positions(result.children);
      const radius = autoPadding === false ? 0 : 10;
      expect(points).toHaveLength(2);
      expect(points[0]).toEqual([expect.closeTo(radius), expect.closeTo(200 - radius)]);
      expect(points[1]).toEqual([expect.closeTo(200 - radius), expect.closeTo(radius)]);
    }
  });
  it('保留现有默认值并仅在选择时发出标记约束', () => {
    const source = {
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' }, properties: { size: 10 } },
    };
    const original = resolveChart(ScatterChartSchema.parse(source), scatterChartDefinition, runtime).plot;
    const explicit = resolveChart(
      ScatterChartSchema.parse({
        ...source,
        recipe: { ...source.recipe, properties: { size: 10, autoPadding: 'max-radius' } },
      }),
      scatterChartDefinition,
      runtime,
    ).plot;

    expect(explicit).toEqual(original);

    const aware = resolveChart(
      ScatterChartSchema.parse({
        ...source,
        recipe: { ...source.recipe, properties: { autoPadding: 'point-aware', domainPadding: { left: 0 } } },
      }),
      scatterChartDefinition,
      runtime,
    ).plot;

    expect(aware.scales[0]).toMatchObject({ domainPadding: { kind: 'range', lower: 0 } });
    expect(aware.marks[0]).toMatchObject({ properties: { autoPadding: 'point-aware' } });
    expect(aware.marks[0].id).toBeUndefined();
  });

  it('当显式填充覆盖每一端时，不识别或扫描标记', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { autoPadding: 'point-aware', domainPadding: 0 },
      },
    });
    const result = resolveChart(source, scatterChartDefinition, runtime).plot;

    expect(result.marks[0].id).toBeUndefined();
    expect(result.scales).toEqual(expect.arrayContaining([expect.objectContaining({ domainPadding: 0 })]));
  });
});

describe('点配方 autoPadding 曝光', () => {
  it.each([
    ['scatter', ScatterChartSchema, { x: 'x', y: 'y' }],
    ['bubble', BubbleChartSchema, { x: 'x', y: 'y', size: 'size' }],
    ['regression', RegressionChartSchema, { x: 'x', y: 'y' }],
    ['connected-scatter', ConnectedScatterChartSchema, { x: 'x', y: 'y', order: 'order' }],
    ['ranged-dot', RangedDotChartSchema, { category: 'category', start: 'start', end: 'end' }],
    ['strip', StripChartSchema, { x: 'x', y: 'y' }],
  ])('%s 通过 JSON 往返保留作者策略', (chartType, schema, encodings) => {
    const source = {
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType,
        encodings,
        properties: { autoPadding: { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } } },
      },
    };
    const parsed = schema.parse(JSON.parse(JSON.stringify(source)));

    expect(parsed.recipe.properties?.autoPadding).toEqual({
      kind: 'point-aware',
      clearance: { default: 8, top: 20, left: 0 },
    });
  });
});

describe('点感知最终标记选择', () => {
  it('将策略转发到附加标记和替换标记，而不更改扩展标识', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
        properties: { autoPadding: 'point-aware', size: 40 },
        marks: [
          { kind: 'scatter', override: true, properties: { size: 2 } },
          { kind: 'scatter', properties: { size: 3 } },
        ],
      },
      plotExtension: {
        marks: [
          {
            id: '__chart.mark.0',
            type: 'point',
            encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
            properties: { size: 90 },
          },
        ],
      },
    });
    const result = resolveChart(source, scatterChartDefinition, runtime).plot;
    const ids = result.marks.map(mark => mark.id);

    expect(ids).toEqual([undefined, undefined, '__chart.mark.0']);
    expect(result.marks).toMatchObject([
      { properties: { autoPadding: 'point-aware' } },
      { properties: { autoPadding: 'point-aware' } },
      { properties: { autoPadding: 'max-radius' } },
    ]);
    expect(result.scales.every(scale => !Object.hasOwn(scale, 'domainPadding'))).toBe(true);
    expect(result.marks[0]).toMatchObject({ properties: { size: 2 } });
  });
});

describe('点 autoPadding 间隙', () => {
  const resolvePadding = (autoPadding: unknown, domainPadding?: unknown) =>
    resolveChart(
      ScatterChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'scatter',
          encodings: { x: 'x', y: 'y' },
          properties: { size: 10, autoPadding, domainPadding },
        },
      }),
      scatterChartDefinition,
      runtime,
    ).plot;
  it.each(['max-radius', 'point-aware'])('转发 %s 简写和对象策略', kind => {
    expect(resolvePadding(kind).marks[0]).toMatchObject({ properties: { autoPadding: kind } });
    expect(resolvePadding({ kind }).marks[0]).toMatchObject({ properties: { autoPadding: { kind } } });
  });

  it('保留 Plot 的间隙和显式范围/比率覆盖', () => {
    const clearance = { default: 8, x: 12, top: 20, left: 0 };
    for (const kind of ['max-radius', 'point-aware']) {
      const plot = resolvePadding({ kind, clearance }, { left: 0 });
      expect(plot.marks[0]).toMatchObject({ properties: { autoPadding: { kind, clearance } } });
      expect(plot.scales[0]).toMatchObject({ domainPadding: { kind: 'range', lower: 0 } });
      expect(resolvePadding({ kind, clearance }, 0).scales[0]).toMatchObject({ domainPadding: 0 });
      expect(resolvePadding({ kind, clearance }, { kind: 'ratio', left: 0.1 }).scales[0]).toMatchObject({
        domainPadding: { kind: 'ratio', lower: 0.1, upper: 0 },
      });
    }
  });

  it('拒绝 Source 边界处的缺失策略和无效间隙', () => {
    for (const value of [
      { clearance: 8 },
      { kind: 'point-aware', clearance: -1 },
      { kind: 'point-aware', clearance: Infinity },
      { kind: 'point-aware', clearance: { left: -1 } },
    ])
      expect(() => resolvePadding(value)).toThrow();
  });
});

describe('回归隐藏观测值', () => {
  const plotOf = (hidePoints: boolean | undefined, override = true) =>
    resolveChart(
      RegressionChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'regression',
          encodings: { x: 'x', y: 'y' },
          marks: [
            {
              kind: 'regression',
              override,
              ...(hidePoints === undefined ? {} : { hidePoints }),
              properties: { extraMethods: [{ method: { kind: 'quadratic' } }] },
            },
          ],
        },
      }),
      regressionChartDefinition,
      runtime,
    ).plot;
  it('默认情况下以及明确禁用时保留观察结果', () => {
    for (const value of [undefined, false])
      expect(plotOf(value).marks.map(mark => mark.type)).toEqual(['point', 'path', 'path']);
  });

  it('仅省略选定的观察标记并保留每个拟合变换', () => {
    const plot = plotOf(true);

    expect(plot.marks.map(mark => mark.type)).toEqual(['path', 'path']);

    for (const mark of plot.marks)
      expect(mark.transforms).toEqual([
        { operation: expect.objectContaining({ kind: 'smooth', params: expect.objectContaining({ x: 'x', y: 'y' }) }) },
      ]);

    expect(plotOf(true, false).marks.map(mark => mark.type)).toEqual(['point', 'path', 'path', 'path']);
  });
});

it('仅填充标记覆盖保留继承的整体字段', () => {
  const result = scatterMarkDefinition.resolve({
    chartType: 'scatter',
    source: { kind: 'scatter', properties: { opacity: { fill: 0 } } },
    inherited: {
      encodings: { x: 'amount', y: 'margin', opacity: 'alpha' },
      properties: { opacity: { stroke: 0.8 } },
    },
  });
  expect(result.marks[0]).toMatchObject({
    encodings: { opacity: { overall: 'alpha' } },
    properties: { opacity: { fill: 0, stroke: 0.8 } },
  });
});
