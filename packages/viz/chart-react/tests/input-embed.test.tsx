import type { ChartInput } from '@retikz/chart-vanilla';

import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { createScatterChart } from '@retikz/chart-vanilla/point/scatter';
import { describe, expect, it } from 'vitest';

import { ScatterChart } from '../src/point';

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
    const pointInput = {
      data: [
        { x: 0, y: 1, size: 2 },
        { x: 1, y: 2, size: 3 },
      ],
      dataRef: 'rows',
      layout: { width: 640, height: 360 },
      encodings: { x: 'x', y: 'y' },
      properties: { opacity: 0.5 },
    };
    const reactInput = inputOf(ScatterChart, pointInput);
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
    expect(reactInput.source).toMatchObject({
      type: 'point',
      recipe: { chartType: 'scatter', encodings: pointInput.encodings },
    });
  });

  it('forwards Theme definitions without putting them in Source IR', () => {
    const themeDefinitions = [] as const;
    const input = inputOf(ScatterChart, {
      data: [{ x: 0, y: 1 }],
      encodings: { x: 'x', y: 'y' },
      themeDefinitions,
    });

    expect(input).not.toHaveProperty('themeDefinitions');
    expect(input.source).not.toHaveProperty('themeDefinitions');
  });
});
