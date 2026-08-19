import type { IRPlot } from '@retikz/plot';

import { describe, expect, it } from 'vitest';

import type { InputChart, InputChartPresentationRecord } from '../src';
import type { InputBubbleChart, InputConnectedScatterChart, InputScatterChart } from '../src/point';

import { normalizeChart } from '../src';
import { normalizeBubbleChart, normalizeConnectedScatterChart, normalizeScatterChart } from '../src/point';

const plot: IRPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
};

describe('Chart Vanilla normalization', () => {
  it('assembles Base Chart Source IR and keeps authored presentation order', () => {
    const presentation = [
      { preset: 'subtitle', position: 'top', text: 'Explicit subtitle' },
      { preset: 'source', position: 'bottom', text: 'Explicit source' },
    ] satisfies ReadonlyArray<InputChartPresentationRecord>;
    const input = {
      id: 'sales',
      title: 'Fallback title',
      note: 'Fallback note',
      presentation,
      plot,
    } satisfies InputChart;

    expect(normalizeChart(input)).toEqual({
      namespace: 'chart',
      type: 'base',
      id: 'sales',
      plot,
      presentation: {
        children: [
          { kind: 'preset', key: 'chart.presentation.subtitle', preset: 'subtitle', text: 'Explicit subtitle' },
          { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Fallback title' },
          { kind: 'plot', key: 'chart.plot' },
          { kind: 'preset', key: 'chart.presentation.source', preset: 'source', text: 'Explicit source' },
          { kind: 'preset', key: 'chart.presentation.note', preset: 'note', text: 'Fallback note' },
        ],
      },
    });
  });

  it('rejects duplicate presentation presets before constructing Source IR', () => {
    const input: InputChart = {
      plot,
      presentation: [
        { preset: 'title', text: 'First' },
        { preset: 'title', text: 'Second' },
      ],
    };

    expect(() => normalizeChart(input)).toThrow("Chart presentation preset 'title' may appear at most once");
  });

  it('assembles an exact Scatter Source IR without a public type selector', () => {
    const input = {
      title: 'Scatter title',
      plot: { data: { reference: 'rows' } },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    } satisfies InputScatterChart;

    expect(normalizeScatterChart(input)).toEqual({
      namespace: 'chart',
      type: 'scatter',
      presentation: {
        children: [
          { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Scatter title' },
          { kind: 'plot', key: 'chart.plot' },
        ],
      },
      plot: { data: { reference: 'rows' } },
      config: { encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    });
  });

  it('fixes every Point normalizer to its exact Source IR discriminator', () => {
    const bubble = {
      plot: { data: { reference: 'rows' } },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        size: { field: 'size' },
      },
    } satisfies InputBubbleChart;
    const connected = {
      plot: { data: { reference: 'rows' } },
      encoding: { x: { field: 'x' }, y: { field: 'y' }, order: 'step' },
      components: { connection: { strokeWidth: { kind: 'constant', value: 2 } } },
    } satisfies InputConnectedScatterChart;

    expect(normalizeBubbleChart(bubble)).toMatchObject({
      namespace: 'chart',
      type: 'bubble',
      config: { encoding: bubble.encoding },
    });
    expect(normalizeConnectedScatterChart(connected)).toMatchObject({
      namespace: 'chart',
      type: 'connected-scatter',
      config: {
        encoding: connected.encoding,
        components: { connection: { strokeWidth: { kind: 'constant', value: 2 } } },
      },
    });
  });
});
