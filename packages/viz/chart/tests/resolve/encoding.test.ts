import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import {
  DataFieldType,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineStatisticsReducer,
  defineTransform,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { defineScale } from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveChartEncodingMappings, resolveSelectedChart } from '../../src/_chart/resolve';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';

const registry = resolveChartProviderRegistry([
  { family: 'point', recipe: ScatterChartDefinition, chartThemeDefinitions: [] },
]);

const resolveScatter = (
  recipe: Record<string, unknown>,
  plotExtension?: Record<string, unknown>,
  runtime = registry.runtime,
) => {
  const source = ScatterChartSchema.parse({
    namespace: 'chart',
    type: 'point',
    data: { reference: 'rows' },
    recipe: { chartType: 'scatter', ...recipe },
    ...(plotExtension === undefined ? {} : { plotExtension }),
  });
  return resolveSelectedChart(source, {
    theme: DEFAULT_RESOLVED_THEME,
    recipe: ScatterChartDefinition,
    chartThemeDefinitions: [],
    runtime,
  });
};

const resolveOrdinalFallback = (color: unknown) => {
  const source = ScatterChartSchema.parse({
    namespace: 'chart',
    type: 'point',
    data: { reference: 'rows' },
    recipe: {
      chartType: 'scatter',
      encodings: { x: 'amount', y: 'margin', color },
    },
  });

  return resolveChartEncodingMappings(
    { source, encodings: source.recipe.encodings, runtime: registry.runtime },
    ['color'],
    [
      {
        slot: 'color',
        scale: {
          family: 'channel',
          type: 'ordinal',
          recipeFallback: { name: '__chart.regression.scale.series', type: 'ordinal' },
        },
      },
    ],
  );
};

describe('分散 Chart 编码解析结果', () => {
  it('按有序槽合并聚合映射，并仅对直接后汇总字段进行分组', () => {
    const result = resolveScatter({
      encodings: {
        color: { aggregate: { kind: 'max', field: 'intensity', as: 'maxIntensity' } },
        y: { aggregate: { kind: 'mean', field: 'margin', as: 'meanMargin' } },
        x: 'species',
        shape: 'island',
      },
    });

    expect(result.plot.transform).toEqual([
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['species', 'island'],
            metrics: [
              { kind: 'mean', field: 'margin', as: 'meanMargin' },
              { kind: 'max', field: 'intensity', as: 'maxIntensity' },
            ],
          },
        },
      },
    ]);
    expect(result.plot.marks[0]).toMatchObject({
      encodings: {
        position: { x: { field: 'species' }, y: { field: 'meanMargin' } },
        color: 'maxIntensity',
        shape: 'island',
      },
    });
  });

  it('在聚合 groupBy 中保留有序的层次结构维度', () => {
    const result = resolveScatter({
      encodings: {
        x: { aggregate: { kind: 'mean', field: 'amount', as: 'meanAmount' } },
        y: 'margin',
        row: [{ field: 'region' }, { field: 'market' }],
        column: 'year',
      },
    });

    expect(result.plot.transform).toEqual([
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['margin', 'region', 'market', 'year'],
            metrics: [{ kind: 'mean', field: 'amount', as: 'meanAmount' }],
          },
        },
      },
    ]);
  });

  it('保留编写的数据转换顺序并绑定输出字段', () => {
    const transform = [
      { operation: { kind: 'normalize', params: { field: 'amount', as: 'amountShare' } } },
      { operation: { kind: 'jitter', params: { axis: 'y', yField: 'margin', amount: 0.5 } } },
    ] as const;
    const result = resolveScatter({ encodings: { x: 'amountShare', y: 'margin' } }, { transform: [...transform] });
    expect(result.plot.transform).toEqual(transform);
    expect(result.plot.marks[0]).toMatchObject({
      encodings: { position: { x: { field: 'amountShare' }, y: { field: 'margin' } } },
    });
  });

  it('拒绝同级聚合依赖关系', () => {
    expect(() =>
      resolveScatter({
        encodings: {
          x: { aggregate: { kind: 'sum', field: 'totalMargin', as: 'totalAmount' } },
          y: { aggregate: { kind: 'sum', field: 'margin', as: 'totalMargin' } },
        },
      }),
    ).toThrow(/sibling aggregate output/);
  });

  it('拒绝显式数据链已经产生的聚合输出', () => {
    expect(() =>
      resolveScatter(
        {
          encodings: {
            x: 'group',
            y: { aggregate: { kind: 'sum', field: 'amount', as: 'totalAmount' } },
          },
        },
        { transform: [{ operation: { kind: 'normalize', params: { field: 'amount', as: 'totalAmount' } } }] },
      ),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'y', 'aggregate'] }),
      }),
    );
  });

  it('连接命名比例一次并仅替换编写的位置回退', () => {
    const result = resolveScatter({
      encodings: {
        x: {
          field: 'amount',
          scale: { operation: { type: 'log', name: 'amountScale' } },
        },
        y: {
          field: 'margin',
          scale: { reference: '__chart.scatter.scale.y' },
        },
        color: {
          field: 'group',
          scale: { operation: { type: 'ordinal', name: 'groupColorScale' } },
        },
        size: {
          field: 'weight',
          scale: { operation: { type: 'sqrt', name: 'weightSizeScale' } },
        },
        opacity: {
          field: 'confidence',
          scale: { operation: { type: 'linear', name: 'confidenceOpacityScale' } },
        },
      },
    });

    expect(result.plot.scales.map(scale => scale.name)).toEqual([
      '__chart.scatter.scale.y',
      'amountScale',
      'groupColorScale',
      'weightSizeScale',
      'confidenceOpacityScale',
    ]);
    expect(result.plot.coordinate).toMatchObject({ x: 'amountScale', y: '__chart.scatter.scale.y' });
    expect(result.plot.marks[0]).toMatchObject({
      encodings: {
        color: { field: 'group', scale: 'groupColorScale' },
        size: { field: 'weight', scale: 'weightSizeScale' },
        opacity: { overall: { field: 'confidence', scale: 'confidenceOpacityScale' } },
      },
    });
  });

  it('解决并独立替换通道消费者的序数配方回退', () => {
    const inherited = resolveOrdinalFallback({
      field: 'group',
      scale: { reference: '__chart.regression.scale.series' },
    });

    expect(inherited.encodings.color).toEqual({
      field: 'group',
      scale: '__chart.regression.scale.series',
    });
    expect(inherited.scales).toEqual([]);
    expect([...inherited.removedRecipeScales]).toEqual([]);

    const replaced = resolveOrdinalFallback({
      field: 'group',
      scale: { operation: { type: 'ordinal', name: 'seriesOverride' } },
    });

    expect(replaced.encodings.color).toEqual({ field: 'group', scale: 'seriesOverride' });
    expect(replaced.scales).toEqual([{ type: 'ordinal', name: 'seriesOverride' }]);
    expect([...replaced.removedRecipeScales]).toEqual(['__chart.regression.scale.series']);
  });

  it('拒绝序数通道回退消费者的非序数比例尺', () => {
    expect(() =>
      resolveOrdinalFallback({
        field: 'group',
        scale: { operation: { type: 'sequential', name: 'seriesSequential' } },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'color', 'scale'] }),
      }),
    );
  });

  it('拒绝重复的比例源和缺失的参考', () => {
    expect(() =>
      resolveScatter(
        {
          encodings: {
            x: { field: 'amount', scale: { operation: { type: 'log', name: 'duplicate' } } },
            y: 'margin',
          },
        },
        { scales: [{ type: 'linear', name: 'duplicate' }] },
      ),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'scale'] }) }),
    );

    expect(() =>
      resolveScatter({
        encodings: {
          x: { field: 'amount', scale: { reference: 'missing' } },
          y: 'margin',
        },
      }),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'scale'] }) }),
    );
  });

  it('拒绝跨槽配方回退引用', () => {
    for (const encodings of [
      {
        x: { field: 'amount', scale: { reference: '__chart.scatter.scale.y' } },
        y: 'margin',
      },
      {
        x: 'amount',
        y: { field: 'margin', scale: { reference: '__chart.scatter.scale.x' } },
      },
    ]) {
      expect(() => resolveScatter({ encodings })).toThrowError(
        expect.objectContaining({
          details: expect.objectContaining({
            path: expect.arrayContaining(['recipe', 'encodings', 'scale']),
          }),
        }),
      );
    }
  });

  it('从 Plot 拥有的原子组装面组成', () => {
    const facet = resolveScatter({
      encodings: {
        x: 'amount',
        y: 'margin',
        row: 'channel',
        column: [{ field: 'region', order: ['east', 'west'] }],
        facet: { empty: 'show', spacing: { panelGap: 12 } },
      },
    });

    expect(facet.plot.composition).toMatchObject({
      defaultView: '__chart.scatter.view.main',
      arrangements: [
        {
          kind: 'facet',
          id: '__chart.scatter.composition.facet',
          view: '__chart.scatter.view.main',
          row: { field: 'channel' },
          column: [{ field: 'region', order: ['east', 'west'] }],
          empty: 'show',
        },
      ],
    });
  });

  it('在编写标记继承它们之前投影丰富的根映射', () => {
    const result = resolveScatter({
      encodings: {
        x: 'species',
        y: { aggregate: { kind: 'mean', field: 'margin', as: 'meanMargin' } },
        size: {
          field: 'weight',
          scale: { operation: { type: 'sqrt', name: 'weightSizeScale' } },
        },
      },
      marks: [{ kind: 'scatter', properties: { opacity: 0.5 } }],
    });

    expect(result.plot.marks).toHaveLength(2);

    for (const mark of result.plot.marks) {
      expect(mark).toMatchObject({
        encodings: {
          position: { x: { field: 'species' }, y: { field: 'meanMargin' } },
          size: { field: 'weight', scale: 'weightSizeScale' },
        },
      });
    }
  });

  it('通过所属模块定义解决自定义转换、归约器和缩放操作', () => {
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
    const range = defineStatisticsReducer({
      schema: strictObject({
        kind: literal('range-chart-value'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputs: operation => [{ field: operation.as, type: DataFieldType.Continuous }],
    });
    const mono = defineScale({
      family: 'channel',
      schema: strictObject({
        type: literal('mono-chart'),
        name: NonBlankStringSchema,
        tone: literal('mono').default('mono'),
      }),
      isFieldCompatible: () => true,
      resolve: () => ({
        of: () => '#111111',
        legendForm: 'swatch',
        domain: [],
        range: ['#111111'],
        scaleType: 'mono-chart',
      }),
    });
    const customRegistry = resolveChartProviderRegistry([
      {
        family: 'point',
        recipe: ScatterChartDefinition,
        chartThemeDefinitions: [],
        runtimeDefinitions: { transforms: [copyField], statisticsReducers: [range], scales: [mono] },
      },
    ]);

    const transformed = resolveScatter(
      {
        encodings: {
          x: 'copiedAmount',
          y: 'margin',
          color: {
            field: 'group',
            scale: { operation: { type: 'mono-chart', name: 'groupMono' } },
          },
        },
      },
      { transform: [{ operation: { kind: 'copy-chart-field', params: { field: 'amount', as: 'copiedAmount' } } }] },
      customRegistry.runtime,
    );

    expect(transformed.plot.transform).toEqual([
      { operation: { kind: 'copy-chart-field', params: { field: 'amount', as: 'copiedAmount' } } },
    ]);
    expect(transformed.plot.scales).toContainEqual({ type: 'mono-chart', name: 'groupMono', tone: 'mono' });

    const extended = resolveScatter(
      {
        encodings: {
          x: 'amount',
          y: 'margin',
          color: { field: 'group', scale: { reference: 'extensionMono' } },
        },
      },
      { scales: [{ type: 'mono-chart', name: 'extensionMono' }] },
      customRegistry.runtime,
    );

    expect(extended.plot.scales).toContainEqual({ type: 'mono-chart', name: 'extensionMono', tone: 'mono' });

    const aggregated = resolveScatter(
      {
        encodings: {
          x: 'group',
          y: 'margin',
          color: { aggregate: { kind: 'range-chart-value', field: 'amount', as: 'amountRange' } },
        },
      },
      undefined,
      customRegistry.runtime,
    );

    expect(aggregated.plot.transform).toEqual([
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['group', 'margin'],
            metrics: [{ kind: 'range-chart-value', field: 'amount', as: 'amountRange' }],
          },
        },
      },
    ]);
  });

  it('拒绝重写已注册操作标识的 Scale Definition schema', () => {
    const renamed = defineScale({
      family: 'channel',
      schema: strictObject({
        type: literal('renamed-chart'),
        name: NonBlankStringSchema.transform(name => `${name}.parsed`),
      }),
      isFieldCompatible: () => true,
      resolve: () => ({
        of: () => '#111111',
        legendForm: 'swatch',
        domain: [],
        range: ['#111111'],
        scaleType: 'renamed-chart',
      }),
    });
    const customRegistry = resolveChartProviderRegistry([
      {
        family: 'point',
        recipe: ScatterChartDefinition,
        chartThemeDefinitions: [],
        runtimeDefinitions: { scales: [renamed] },
      },
    ]);

    for (const [recipe, plotExtension, path] of [
      [
        {
          encodings: {
            x: 'amount',
            y: 'margin',
            color: { field: 'group', scale: { operation: { type: 'renamed-chart', name: 'direct' } } },
          },
        },
        undefined,
        ['recipe', 'encodings', 'color', 'scale'],
      ],
      [
        {
          encodings: {
            x: 'amount',
            y: 'margin',
            color: { field: 'group', scale: { reference: 'extension' } },
          },
        },
        { scales: [{ type: 'renamed-chart', name: 'extension' }] },
        ['recipe', 'encodings', 'color', 'scale'],
      ],
    ] as const) {
      expect(() => resolveScatter(recipe, plotExtension, customRegistry.runtime)).toThrowError(
        expect.objectContaining({ details: expect.objectContaining({ path }) }),
      );
    }
  });

  it('在具体编码映射处定位未注册的自定义操作', () => {
    expect(() =>
      resolveScatter({
        encodings: {
          x: 'amount',
          y: 'margin',
          color: { aggregate: { kind: 'missing-reducer', field: 'amount', as: 'missing' } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'color', 'aggregate'] }),
      }),
    );
    expect(() =>
      resolveScatter({
        encodings: {
          x: 'amount',
          y: 'margin',
          color: { field: 'group', scale: { operation: { type: 'missing-scale', name: 'missing' } } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'color', 'scale'] }),
      }),
    );
  });
});
