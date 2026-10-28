import type { IRChartSource } from '@retikz/chart';
import { defineChartTheme } from '@retikz/chart';
import { defineTheme } from '@retikz/core';
import {
  applyTransformsToDataView,
  createDataView,
  resolveTransformRegistry,
  defineTransformImplementation,
  defineRegressionImplementation,
  defineTransform,
  defineRegression,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { definePlotTheme } from '@retikz/plot';
import type { AnyInputEmbed } from '@retikz/vanilla';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { renderChart } from '../src';
import {
  scatterChartInputEmbedAdapter,
  bubbleChartInputEmbedAdapter,
  connectedScatterChartInputEmbedAdapter,
  rangedDotChartInputEmbedAdapter,
  regressionChartInputEmbedAdapter,
  stripChartInputEmbedAdapter,
} from '../src/point';
import {
  bubbleChart,
  connectedScatterChart,
  rangedDotChart,
  regressionChart,
  scatterChart,
  stripChart,
} from '../src/point';

const adapters = [
  scatterChartInputEmbedAdapter,
  bubbleChartInputEmbedAdapter,
  connectedScatterChartInputEmbedAdapter,
  rangedDotChartInputEmbedAdapter,
  regressionChartInputEmbedAdapter,
  stripChartInputEmbedAdapter,
];

const sourceOf = (chart: AnyInputEmbed): IRChartSource =>
  normalizeScene(scene({ children: [chart] }), { adapters }).ir.children[0] as IRChartSource;

const rows = [
  { x: 1, y: 2, size: 3, order: 1 },
  { x: 2, y: 4, size: 5, order: 2 },
];

const regressionRows = [
  { x: 1, y: 2, species: 'setosa' },
  { x: 2, y: 4, species: 'setosa' },
  { x: 1, y: 3, species: 'versicolor' },
  { x: 2, y: 5, species: 'versicolor' },
];

type ScenePrimitiveLike = Readonly<{
  id?: string;
  children?: ReadonlyArray<ScenePrimitiveLike>;
}>;

const sceneIdsOf = (primitives: ReadonlyArray<ScenePrimitiveLike>): Array<string> =>
  primitives.flatMap(primitive => [
    ...(primitive.id === undefined ? [] : [primitive.id]),
    ...sceneIdsOf(primitive.children ?? []),
  ]);

describe('Chart Vanilla 编写', () => {
  it('创建 Bubble Source、一个运行时数据集及其具体提供者贡献', () => {
    const chart = bubbleChart({
      data: rows,
      dataRef: 'bubble.rows',
      encodings: { x: 'x', y: 'y', size: 'size' },
    });

    expect(sourceOf(chart)).toMatchObject({
      type: 'point',
      data: { reference: 'bubble.rows' },
      recipe: { chartType: 'bubble', encodings: { size: 'size' } },
    });
    expect({ [chart.props.dataRef ?? 'chart.data']: chart.props.data }).toEqual({ 'bubble.rows': rows });
  });

  it('通过与其他点图相同的 SSR 路径渲染气泡', () => {
    const chart = bubbleChart({
      id: 'bubble',
      data: rows,
      encodings: { x: 'x', y: 'y', size: 'size' },
    });
    const rendered = renderChart(chart, { adapters });

    expect(rendered.svg).toContain('<svg');
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toContain('bubble');
  });

  it('创建回归 Source、数据集绑定及其具体提供者贡献', () => {
    const chart = regressionChart({
      data: regressionRows,
      dataRef: 'regression.rows',
      encodings: { x: 'x', y: 'y', series: 'species' },
      properties: { method: { kind: 'linear' }, sampleCount: 8 },
    });

    expect(sourceOf(chart)).toMatchObject({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'regression.rows' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', series: 'species' },
        properties: { method: { kind: 'linear' }, sampleCount: 8 },
      },
    });
    expect({ [chart.props.dataRef ?? 'chart.data']: chart.props.data }).toEqual({ 'regression.rows': regressionRows });
  });

  it('通过 SSR 渲染分组回归，无需序列化运行时定义', () => {
    const chart = regressionChart({
      id: 'regression',
      data: regressionRows,
      encodings: { x: 'x', y: 'y', series: 'species' },
      properties: { sampleCount: 8, extraMethods: [{ method: { kind: 'power' }, trend: { stroke: '#ff0000' } }] },
    });
    const rendered = renderChart(chart, { adapters });
    const serializedSource = JSON.stringify(sourceOf(chart));

    expect(rendered.svg).toContain('<svg');
    expect(rendered.svg).toContain('#ff0000');
    expect((rendered.svg.match(/<ellipse\b/g) ?? []).length).toBe(regressionRows.length);
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toContain('regression');
    expect(serializedSource).not.toMatch(/providers|definitions|schema|apply|lowerOptions/iu);
    expect(JSON.parse(serializedSource)).toEqual(sourceOf(chart));
  });

  it('不公开通用 Chart 编写路径', async () => {
    const module = await import('../src');

    expect(module).not.toHaveProperty('createChart');
    expect(module).not.toHaveProperty('normalizeChart');
  });

  it('转发命名主题定义和 Plot 下沉选项，而不将它们放入 Source 中', () => {
    const chartThemeDefinitions = [defineChartTheme({ name: 'scatter-theme', defaults: { layout: { gap: 8 } } })];
    const lowerOptions = { datasetFieldMaps: { rows: { x: 'x' } } } as const;
    const result = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      chartThemeDefinitions,
      lowerOptions,
    });

    expect(result.props.chartThemeDefinitions).toBe(chartThemeDefinitions);
    expect(result.props.lowerOptions).toBe(lowerOptions);
    expect(sourceOf(result)).not.toHaveProperty('chartThemeDefinitions');
  });

  it('在编写结果和 SSR 中保留 Core 宿主主题和主题定义', () => {
    const hostTheme = defineTheme({
      name: 'host-style',
      resolve: () => ({ categorical: ['#123456'] }),
    });
    const result = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      theme: { name: 'host-style', mode: 'dark' },
      themeDefinitions: [hostTheme],
      chartThemeDefinitions: [
        defineChartTheme({
          name: 'host-style',
          defaults: { background: { fill: '#ffffff' } },
        }),
      ],
      lowerOptions: {
        definitions: { plotThemeDefinitions: [definePlotTheme({ name: 'host-style', resolve: () => ({}) })] },
      },
    });

    expect(result.props.theme).toEqual({ name: 'host-style', mode: 'dark' });
    expect(result.props.themeDefinitions).toEqual([hostTheme]);
    expect(sourceOf(result)).not.toHaveProperty('theme');
    expect(sourceOf(result)).not.toHaveProperty('chartThemeDefinitions');
    expect(renderChart(result, { adapters }).svg).toContain('#123456');
  });

  it('将显式 Chart 默认值写入 Source，同时在宿主结果中保留 Core 主题', () => {
    const result = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      defaultChart: { background: { fill: '#abcdef' } },
    });

    expect(sourceOf(result).defaultChart).toEqual({ background: { fill: '#abcdef' } });
    expect(result).not.toHaveProperty('theme');
  });

  it('通过具体工厂转发稀疏点配方辅助线控制', () => {
    const scatter = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y', size: 'size' },
      guides: { axis: false, grid: false, legend: false },
    });
    const strip = stripChart({
      data: rows,
      encodings: {
        x: { field: 'x', scale: { operation: { type: 'point', name: 'x' } } },
        y: { field: 'y', scale: { operation: { type: 'linear', name: 'y' } } },
      },
      guides: { grid: false },
    });

    expect(sourceOf(scatter).recipe.guides).toEqual({ axis: false, grid: false, legend: false });
    expect(sourceOf(strip).recipe.guides).toEqual({ grid: false });
  });

  it('通过每个点工厂的共享帮助程序路由 Core 宿主主题元数据', () => {
    const factories = [
      () => scatterChart({ data: rows, encodings: { x: 'x', y: 'y' }, theme: { mode: 'dark' } }),
      () => bubbleChart({ data: rows, encodings: { x: 'x', y: 'y', size: 'size' }, theme: { mode: 'dark' } }),
      () =>
        regressionChart({
          data: regressionRows,
          encodings: { x: 'x', y: 'y' },
          theme: { mode: 'dark' },
        }),
      () =>
        connectedScatterChart({
          data: rows,
          encodings: { x: 'x', y: 'y', order: 'order' },
          theme: { mode: 'dark' },
        }),
      () =>
        rangedDotChart({
          data: rows,
          encodings: { category: 'x', start: 'y', end: 'size' },
          theme: { mode: 'dark' },
        }),
    ];

    for (const create of factories) {
      const result = create();

      expect(result.props.theme).toEqual({ mode: 'dark' });
      expect(sourceOf(result)).not.toHaveProperty('theme');
      expect(sourceOf(result)).not.toHaveProperty('theme');
    }
  });

  it('与 Chart 解析结果和 Plot 下沉共享自定义转换定义，无需序列化运行时', () => {
    const copyField = defineTransform({
      kind: 'copy-chart-field',
      paramsSchema: strictObject({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
      inputFields: operation => [operation.params.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as, type: { from: operation.params.field } }],
      }),
    });
    const copyFieldImplementation = defineTransformImplementation({
      definition: copyField,
      apply: (inputRows, operation) =>
        inputRows.map(row => ({ ...row, [operation.params.as]: row[operation.params.field] })),
    });
    const chart = scatterChart({
      id: 'custom-transform',
      data: rows,
      encodings: {
        x: 'copiedX',
        y: 'y',
      },
      plotExtension: {
        transform: [{ operation: { kind: 'copy-chart-field', params: { field: 'x', as: 'copiedX' } } }],
      },
      lowerOptions: {
        definitions: { transforms: [copyField] },
        implementations: { transforms: [copyFieldImplementation] },
      },
    });

    expect(renderChart(chart, { adapters }).svg.match(/<ellipse/g)).toHaveLength(rows.length);
    expect(JSON.stringify(sourceOf(chart))).toContain('copy-chart-field');
    expect(JSON.stringify(sourceOf(chart))).not.toMatch(/outputModel|apply/);

    const prepared = applyTransformsToDataView(
      createDataView(rows, [
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ]),
      [{ kind: 'copy-chart-field', params: { field: 'x', as: 'copiedX' } }],
      {
        registry: resolveTransformRegistry([copyField]),
        transformImplementations: [copyFieldImplementation],
      },
    ).dataView;
    expect(prepared.rows.map(row => row.copiedX)).toEqual(rows.map(row => row.x));
    expect(prepared.model).toContainEqual(expect.objectContaining({ name: 'copiedX', type: 'continuous' }));
    const fromResult = scatterChart({
      data: [...prepared.rows],
      dataModel: [...prepared.model],
      encodings: { x: 'copiedX', y: 'y' },
    });
    expect(renderChart(fromResult, { adapters }).svg.match(/<ellipse/g)).toHaveLength(rows.length);
    expect(sourceOf(fromResult).plotExtension).toBeUndefined();
  });

  it('将类型化点工厂标准化为族加上 chartType Source IR', () => {
    const scatter = scatterChart({ data: rows, encodings: { x: 'x', y: 'y' } });

    expect(sourceOf(scatter)).toMatchObject({ type: 'point', recipe: { chartType: 'scatter' } });
    expect(sourceOf(scatter)).not.toHaveProperty('config');
  });

  it('通过 Core 适配器保留 Chart、派生 Plot、标记和 Plot 区域标识', () => {
    const chart = scatterChart({
      id: 'scatter',
      data: rows,
      encodings: { x: 'x', y: 'y' },
      layout: { width: 320, height: 200 },
      lowerOptions: { provenance: true, datumProvenance: true },
    });
    const rendered = renderChart(chart, { adapters, output: { width: 320, height: 200 } });

    expect(rendered.svg).toContain('<svg');
    expect(rendered.compileResult.scene.primitives).toHaveLength(1);
    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toEqual(
      expect.arrayContaining(['scatter', 'scatter/plot', 'scatter/plot.mark.0', 'scatter/plot.plotArea']),
    );
  });

  it('显式宽高直接决定取景，输出尺寸只改变显示尺寸', () => {
    const chart = scatterChart({
      data: rows,
      encodings: { x: 'x', y: 'y' },
      layout: { width: 320, height: 200 },
    });
    const rendered = renderChart(chart, { adapters });
    const scaled = renderChart(chart, { adapters, output: { width: 640, height: 400 } });

    expect(rendered.compileResult.scene.layout).toEqual({ x: 0, y: 0, width: 320, height: 200 });
    expect(rendered.svg).toContain('viewBox="0 0 320 200"');
    expect(scaled.compileResult.scene.layout).toEqual(rendered.compileResult.scene.layout);
    expect(scaled.svg).toContain('width="640" height="400"');
    expect(scaled.svg).toContain('viewBox="0 0 320 200"');
  });

  it.each([undefined, { width: 320 }])('没有完整布局尺寸时保留自动取景与显式 padding：%j', layout => {
    const chart = scatterChart({ data: rows, encodings: { x: 'x', y: 'y' }, layout });
    const automatic = renderChart(chart, { adapters }).compileResult.scene.layout;
    const unpadded = renderChart(chart, { adapters, compile: { padding: 0 } }).compileResult.scene.layout;

    expect(automatic.width).toBeCloseTo(unpadded.width + 20);
    expect(automatic.height).toBeCloseTo(unpadded.height + 20);
  });

  it('不会为没有来源追溯的匿名 Chart 合成 Scene id', () => {
    const chart = scatterChart({ data: rows, encodings: { x: 'x', y: 'y' } });
    const rendered = renderChart(chart, { adapters });

    expect(sceneIdsOf(rendered.compileResult.scene.primitives)).toEqual([]);
  });
});

describe('自定义回归 SSR', () => {
  it('消费运行时定义并仅在 Source 中保留 JSON 方法参数', () => {
    const definition = defineRegression({ schema: strictObject({ kind: literal('identity-fit') }) });
    const definitionImplementation = defineRegressionImplementation({
      definition,
      fit: () => ({ predict: x => x }),
    });
    const chart = regressionChart({
      data: regressionRows,
      encodings: { x: 'x', y: 'y' },
      properties: { method: { kind: 'identity-fit' }, trend: { curve: 'catmullRom' } },
      lowerOptions: {
        definitions: { regressions: [definition] },
        implementations: { regressions: [definitionImplementation] },
      },
    });
    const rendered = renderChart(chart, { adapters });

    expect(rendered.svg).toContain('<svg');
    expect((rendered.svg.match(/<ellipse\b/g) ?? []).length).toBe(regressionRows.length);
    expect(JSON.stringify(sourceOf(chart))).not.toMatch(/regressionDefinitions|predict|schema/);
  });
});
