import type { IRChartSource } from '@retikz/chart';
import {
  BubbleChartInputEmbedAdapter,
  RegressionChartInputEmbedAdapter,
  ScatterChartInputEmbedAdapter,
} from '@retikz/chart-vanilla/point';
import type { BubbleChartInputEmbedProps } from '@retikz/chart-vanilla/point/bubble';
import { bubbleChart } from '@retikz/chart-vanilla/point/bubble';
import type { RegressionChartInputEmbedProps } from '@retikz/chart-vanilla/point/regression';
import { regressionChart } from '@retikz/chart-vanilla/point/regression';
import type { ScatterChartInputEmbedProps } from '@retikz/chart-vanilla/point/scatter';
import { scatterChart } from '@retikz/chart-vanilla/point/scatter';
import { defineRegression } from '@retikz/data';
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

const sourceOf = (input: ScatterChartInputEmbedProps): IRChartSource =>
  normalizeScene(scene({ children: [scatterChart(input)] }), { adapters: [ScatterChartInputEmbedAdapter] }).ir
    .children[0] as IRChartSource;

describe('Chart React InputEmbed routing', () => {
  it('uses the matching Vanilla adapter for every typed chartType component', () => {
    expect(BubbleChart.inputEmbedAdapter).toBe(BubbleChartInputEmbedAdapter);
    expect(RegressionChart.inputEmbedAdapter).toBe(RegressionChartInputEmbedAdapter);
    expect(ScatterChart.inputEmbedAdapter).toBe(ScatterChartInputEmbedAdapter);
  });

  it('produces the same precise Regression input as its Vanilla factory', () => {
    const regressionInput: RegressionChartInputEmbedProps = {
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
      marks: [{ kind: 'regression', override: true, properties: { trend: { strokeOpacity: 0.7 } } }],
    };
    const reactInput = inputOf(RegressionChart, {
      children: (
        <>
          <ChartData data={regressionInput.data} reference={regressionInput.dataRef} />
          <ChartLayout layout={regressionInput.layout} />
          <RegressionEncodings {...regressionInput.encodings} />
          <RegressionProperties {...regressionInput.properties} />
          <RegressionMark override properties={{ trend: { strokeOpacity: 0.7 } }} />
        </>
      ),
    });
    const vanillaInput = regressionChart(regressionInput).props;

    expect(reactInput).toEqual(vanillaInput);
  });

  it('produces the same precise Bubble input as its Vanilla factory', () => {
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

  it('produces the same precise Point input as its Vanilla factory', () => {
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

  it('maps ChartData reference/model without serializing runtime rows', () => {
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

  it('forwards Theme definitions without putting them in Source IR', () => {
    const themeDefinitions = [] as const;
    const input = inputOf(ScatterChart, {
      themeDefinitions,
      children: (
        <>
          <ChartData data={[{ x: 0, y: 1 }]} />
          <ScatterEncodings x="x" y="y" />
        </>
      ),
    });

    expect(input.themeDefinitions).toBe(themeDefinitions);
    expect(sourceOf(input)).not.toHaveProperty('themeDefinitions');
  });

  it('keeps resolveLabel in runtime options and lets explicit lowerOptions win by mark id', () => {
    const childResolveLabel = (row: Record<string, unknown>): string => String(row.label);
    const explicitResolveLabel = (): string => 'explicit';
    const input = inputOf(ScatterChart, {
      lowerOptions: { resolveLabel: { labelled: explicitResolveLabel } },
      children: (
        <>
          <ChartData data={[{ x: 0, y: 1, label: 'A' }]} />
          <ScatterEncodings x="x" y="y" />
          <ChartExtension>
            <PointMark id="labelled" x="x" y="y" resolveLabel={childResolveLabel} />
            <PointMark id="child-only" x="x" y="y" resolveLabel={childResolveLabel} />
          </ChartExtension>
        </>
      ),
    });

    expect(input.lowerOptions?.resolveLabel?.labelled).toBe(explicitResolveLabel);
    expect(input.lowerOptions?.resolveLabel?.['child-only']).toBe(childResolveLabel);
    expect(JSON.stringify(sourceOf(input))).not.toContain('resolveLabel');
  });
});

describe('custom Regression adapter parity', () => {
  it('preserves custom methods and runtime definitions through React and Vanilla', () => {
    const definition = defineRegression({
      schema: strictObject({ kind: literal('identity-fit') }),
      fit: () => ({ predict: x => x }),
    });
    const lowerOptions = { regressionDefinitions: [definition] };
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
    expect(react.lowerOptions?.regressionDefinitions?.[0]).toBe(definition);
  });
});
