import type { ChartInput } from '@retikz/chart-vanilla';
import type { CreateScatterChartInput } from '@retikz/chart-vanilla/point/scatter';

import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { createScatterChart } from '@retikz/chart-vanilla/point/scatter';
import { PointMark } from '@retikz/plot-react';
import { describe, expect, it } from 'vitest';

import { ChartData, ChartExtension, ChartLayout } from '../src';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '../src/point/scatter';

type InputComponent<TInput> = {
  inputEmbedAdapter?: unknown;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};

const inputOf = <TInput,>(component: InputComponent<TInput>, props: Readonly<Record<string, unknown>>): TInput =>
  component.createInputEmbedProps(props);

describe('Chart React InputEmbed routing', () => {
  it('uses one Chart InputEmbed adapter for every typed chartType component', () => {
    expect(ScatterChart.inputEmbedAdapter).toBe(ChartInputEmbedAdapter);
  });

  it('produces the same precise Point input as its Vanilla factory', () => {
    const pointInput: CreateScatterChartInput = {
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
      properties: { opacity: 0.5 },
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
    const vanillaInput: ChartInput = createScatterChart(pointInput).input;

    expect(reactInput.source).toEqual(vanillaInput.source);
    expect(reactInput.datasets).toEqual(vanillaInput.datasets);
    expect(reactInput.chartProviderContribution.roots).toEqual(vanillaInput.chartProviderContribution.roots);
    expect(reactInput.chartProviderContribution.providers).toHaveLength(
      vanillaInput.chartProviderContribution.providers.length,
    );
    expect(reactInput.chartProviderContribution.providers.map(provider => provider.key)).toEqual(
      vanillaInput.chartProviderContribution.providers.map(provider => provider.key),
    );
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

    expect(input.source.data).toEqual({
      reference: 'observations',
      model: [{ name: 'x', type: 'continuous' }],
    });
    expect(input.datasets.observations).toEqual([{ x: 0, y: 1 }]);
    expect(JSON.stringify(input.source)).not.toContain('"x":0');
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

    expect(input).not.toHaveProperty('themeDefinitions');
    expect(input.source).not.toHaveProperty('themeDefinitions');
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
    expect(JSON.stringify(input.source)).not.toContain('resolveLabel');
  });
});
