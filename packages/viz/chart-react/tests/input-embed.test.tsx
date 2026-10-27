import type { IRChartSource } from '@retikz/chart';
import {
  bubbleChartInputEmbedAdapter,
  regressionChartInputEmbedAdapter,
  scatterChartInputEmbedAdapter,
} from '@retikz/chart-vanilla/point';
import type { BubbleChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { bubbleChart } from '@retikz/chart-vanilla/point';
import type { RegressionChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { regressionChart } from '@retikz/chart-vanilla/point';
import type { ScatterChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { scatterChart } from '@retikz/chart-vanilla/point';
import { defineRegressionImplementation, defineRegression } from '@retikz/data';
import { PointMark } from '@retikz/plot-react';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { ChartData, ChartExtension, ChartLayout } from '../src';
import { BubbleChart, BubbleEncodings, BubbleProperties } from '../src/point/bubble';
import { RegressionChart, RegressionEncodings, RegressionMark, RegressionProperties } from '../src/point/regression';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '../src/point/scatter';

type InputComponent<TInput> = {
  inputEmbedAdapter?: unknown;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};

const inputOf = <TInput,>(component: InputComponent<TInput>, props: Readonly<Record<string, unknown>>): TInput =>
  component.createInputEmbedProps(props);

const sourceOf = (input: ScatterChartInputEmbedProps<unknown>): IRChartSource =>
  normalizeScene(scene({ children: [scatterChart(input)] }), { adapters: [scatterChartInputEmbedAdapter] }).ir
    .children[0] as IRChartSource;

describe('Chart React InputEmbed 路由', () => {
  it('通过 React 和 Vanilla 保留锚定位和辅助面板属性', () => {
    const panel: NonNullable<ScatterChartInputEmbedProps['panel']> = {
      position: { kind: 'anchor', target: [120, 40], selfAnchor: 'origin' },
      transforms: [{ kind: 'scale', x: 1.5 }],
      zIndex: 3,
    };
    const vanillaInput: ScatterChartInputEmbedProps<unknown> = {
      data: [{ x: 1, y: 2 }],
      encodings: { x: 'x', y: 'y' },
      panel,
    };
    const reactInput = inputOf(ScatterChart, {
      panel,
      children: (
        <>
          <ChartData data={vanillaInput.data} />
          <ScatterEncodings x="x" y="y" />
        </>
      ),
    });
    const normalize = (input: ScatterChartInputEmbedProps<unknown>) =>
      normalizeScene(scene({ children: [scatterChart(input)] }), { adapters: [scatterChartInputEmbedAdapter] }).ir;
    expect(normalize(reactInput)).toEqual(normalize(vanillaInput));
    expect(normalize(reactInput).children[0]).toMatchObject({ type: 'scope', ...panel });
  });

  it('为每个类型的 chartType 组件使用匹配的 Vanilla 适配器', () => {
    expect(BubbleChart.inputEmbedAdapter).toBe(bubbleChartInputEmbedAdapter);
    expect(RegressionChart.inputEmbedAdapter).toBe(regressionChartInputEmbedAdapter);
    expect(ScatterChart.inputEmbedAdapter).toBe(scatterChartInputEmbedAdapter);
  });

  it('产生与其 Vanilla 工厂相同的精确回归输入', () => {
    const regressionInput = {
      data: [
        { x: 1, y: 2, species: 'setosa' },
        { x: 2, y: 4, species: 'setosa' },
        { x: 1, y: 3, species: 'versicolor' },
        { x: 2, y: 5, species: 'versicolor' },
      ],
      dataRef: 'iris.rows',
      layout: { width: 640, height: 360 },
      encodings: {
        x: 'x',
        y: 'y',
        series: { field: 'species', scale: { operation: { type: 'ordinal', name: 'speciesScale' } } },
      },
      properties: {
        method: { kind: 'power' },
        extraMethods: [{ method: { kind: 'linear' }, trend: { stroke: '#f00' } }],
        sampleCount: 12,
        point: { opacity: 0.5 },
        trend: { strokeWidth: 2 },
      },
      marks: [
        { kind: 'regression', hidePoints: true, override: true, properties: { trend: { opacity: { stroke: 0.7 } } } },
      ],
    } satisfies RegressionChartInputEmbedProps;
    const reactInput = inputOf(RegressionChart, {
      children: (
        <>
          <ChartData data={regressionInput.data} reference={regressionInput.dataRef} />
          <ChartLayout layout={regressionInput.layout} />
          <RegressionEncodings {...regressionInput.encodings} />
          <RegressionProperties {...regressionInput.properties} />
          <RegressionMark override hidePoints properties={{ trend: { opacity: { stroke: 0.7 } } }} />
        </>
      ),
    });
    const vanillaInput = regressionChart(regressionInput).props;

    expect(reactInput).toEqual(vanillaInput);
  });

  it('生产与其 Vanilla 工厂相同的精确气泡输入', () => {
    const bubbleInput: BubbleChartInputEmbedProps = {
      data: [
        { income: 1000, lifeExpectancy: 60, population: 1_000_000 },
        { income: 2000, lifeExpectancy: 70, population: 2_000_000 },
      ],
      dataRef: 'countries',
      layout: { width: 800, height: 500 },
      encodings: {
        x: { field: 'income', scale: { operation: { type: 'log', name: 'incomeScale' } } },
        y: 'lifeExpectancy',
        size: 'population',
        color: 'continent',
      },
      properties: {
        opacity: 0.75,
        autoPadding: { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } },
        domainPadding: { kind: 'ratio' as const, default: 0.04, left: 0.02 },
      },
    };
    const reactInput = inputOf(BubbleChart, {
      children: (
        <>
          <ChartData data={bubbleInput.data} reference={bubbleInput.dataRef} />
          <ChartLayout layout={bubbleInput.layout} />
          <BubbleEncodings {...bubbleInput.encodings} />
          <BubbleProperties {...bubbleInput.properties} />
        </>
      ),
    });
    const vanillaInput = bubbleChart(bubbleInput).props;

    expect(reactInput).toEqual(vanillaInput);
  });

  it('产生与其 Vanilla 工厂相同的精确点输入', () => {
    const pointInput: ScatterChartInputEmbedProps = {
      data: [
        { x: 0, y: 1, size: 2, region: 'north' },
        { x: 1, y: 2, size: 3, region: 'south' },
      ],
      dataRef: 'rows',
      layout: { width: 640, height: 360 },
      encodings: {
        x: { aggregate: { kind: 'mean', field: 'x', as: 'meanX' } },
        y: 'y',
        color: {
          field: 'region',
          scale: { operation: { type: 'ordinal', name: 'regionColor' } },
        },
        column: 'region',
        facet: { spacing: { panelGap: 12 } },
      },
      properties: { opacity: 0.5, domainPadding: 0.04 },
    };
    const reactInput = inputOf(ScatterChart, {
      children: (
        <>
          <ChartData data={pointInput.data} reference={pointInput.dataRef} />
          <ChartLayout layout={pointInput.layout} />
          <ScatterEncodings {...pointInput.encodings} />
          <ScatterProperties {...pointInput.properties} />
        </>
      ),
    });
    const vanillaInput = scatterChart(pointInput).props;

    expect(reactInput).toEqual(vanillaInput);
  });

  it('映射 ChartData 参考/模型，无需序列化运行时行', () => {
    const input = inputOf(ScatterChart, {
      children: (
        <>
          <ChartData data={[{ x: 0, y: 1 }]} reference="observations" model={[{ name: 'x', type: 'continuous' }]} />
          <ScatterEncodings x="x" y="y" />
        </>
      ),
    });

    expect(sourceOf(input).data).toEqual({
      reference: 'observations',
      model: [{ name: 'x', type: 'continuous' }],
    });
    expect(input.data).toEqual([{ x: 0, y: 1 }]);
    expect(JSON.stringify(sourceOf(input))).not.toContain('"x":0');
  });

  it('转发主题定义，而不将它们放入 Source IR 中', () => {
    const chartThemeDefinitions = [] as const;
    const input = inputOf(ScatterChart, {
      chartThemeDefinitions,
      children: (
        <>
          <ChartData data={[{ x: 0, y: 1 }]} />
          <ScatterEncodings x="x" y="y" />
        </>
      ),
    });

    expect(input.chartThemeDefinitions).toBe(chartThemeDefinitions);
    expect(sourceOf(input)).not.toHaveProperty('chartThemeDefinitions');
  });

  it('resolveLabel 保留在运行时选项中且显式 lowerOptions 按标记 id 优先覆盖', () => {
    const childResolveLabel = (row: Record<string, unknown>): string => String(row.label);
    const explicitResolveLabel = (): string => 'explicit';
    const input = inputOf(ScatterChart, {
      lowerOptions: { resolveLabel: { labelled: explicitResolveLabel } },
      children: (
        <>
          <ChartData data={[{ x: 0, y: 1, label: 'A' }]} />
          <ScatterEncodings x="x" y="y" />
          <ChartExtension>
            <PointMark
              id="labelled"
              encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
              resolveLabel={childResolveLabel}
            />
            <PointMark
              id="child-only"
              encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
              resolveLabel={childResolveLabel}
            />
          </ChartExtension>
        </>
      ),
    });

    expect(input.lowerOptions?.resolveLabel?.labelled).toBe(explicitResolveLabel);
    expect(input.lowerOptions?.resolveLabel?.['child-only']).toBe(childResolveLabel);
    expect(JSON.stringify(sourceOf(input))).not.toContain('resolveLabel');
  });
});

describe('自定义回归适配器等价性', () => {
  it('通过 React 和 Vanilla 保留自定义方法和运行时定义', () => {
    const definition = defineRegression({ schema: strictObject({ kind: literal('identity-fit') }) });
    const definitionImplementation = defineRegressionImplementation({
      definition,
      fit: () => ({ predict: x => x }),
    });
    const lowerOptions = {
      definitions: { regressions: [definition] },
      implementations: { regressions: [definitionImplementation] },
    };
    const rows = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const properties = { method: { kind: 'identity-fit' }, trend: { curve: 'catmullRom' as const } };
    const react = inputOf(RegressionChart, {
      lowerOptions,
      children: (
        <>
          <ChartData data={rows} />
          <RegressionEncodings x="x" y="y" />
          <RegressionProperties {...properties} />
        </>
      ),
    });
    const vanilla = regressionChart({ data: rows, encodings: { x: 'x', y: 'y' }, properties, lowerOptions }).props;

    expect(react).toEqual(vanilla);
    expect(react.lowerOptions?.definitions?.regressions?.[0]).toBe(definition);
  });
});
