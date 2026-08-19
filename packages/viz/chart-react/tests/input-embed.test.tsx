import type { CreateScatterChartInput } from '@retikz/chart-vanilla/point';
import type { IRPlot } from '@retikz/plot';

import { ChartInputEmbedAdapter, createChart } from '@retikz/chart-vanilla';
import { createScatterChart } from '@retikz/chart-vanilla/point';
import { describe, expect, it } from 'vitest';

import { Chart } from '../src';
import { BubbleChart, ConnectedScatterChart, ScatterChart } from '../src/point';

type InputEmbeddableChartComponent<TInput> = {
  inputEmbedAdapter?: unknown;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>) => TInput;
};

/** 读取 React Chart 组件交给 Vanilla 的唯一输入 */
const inputOf = <TInput,>(
  component: InputEmbeddableChartComponent<TInput>,
  props: Readonly<Record<string, unknown>>,
): TInput => {
  if (component.createInputEmbedProps === undefined) throw new Error('expected a Chart Vanilla input factory');
  return component.createInputEmbedProps(props);
};

describe('Chart React InputEmbed routing', () => {
  it('maps every exact Chart component to the bound Chart adapter', () => {
    const chart = inputOf(Chart, {
      spec: {
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'people' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      },
      data: { people: [{ x: 0, y: 1 }] },
    });
    const scatter = inputOf(ScatterChart, {
      data: [{ x: 0, y: 1 }],
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
    const bubble = inputOf(BubbleChart, {
      data: [{ x: 0, y: 1, size: 2 }],
      encoding: { x: { field: 'x' }, y: { field: 'y' }, size: { field: 'size' } },
    });
    const connected = inputOf(ConnectedScatterChart, {
      data: [{ x: 0, y: 1, order: 1 }],
      encoding: { x: { field: 'x' }, y: { field: 'y' }, order: 'order' },
    });

    expect(Chart.inputEmbedAdapter).toBe(ChartInputEmbedAdapter);
    expect(ScatterChart.inputEmbedAdapter).toBe(ChartInputEmbedAdapter);
    expect(BubbleChart.inputEmbedAdapter).toBe(ChartInputEmbedAdapter);
    expect(ConnectedScatterChart.inputEmbedAdapter).toBe(ChartInputEmbedAdapter);
    expect(chart).not.toHaveProperty('chart');
    expect(chart).toMatchObject({ bound: { type: 'base' } });
    expect(scatter).toMatchObject({ bound: { type: 'scatter' } });
    expect(bubble).toMatchObject({ bound: { type: 'bubble' } });
    expect(connected).toMatchObject({ bound: { type: 'connected-scatter' } });
    expect(scatter).not.toHaveProperty('type');
  });

  it('produces the same Base and Scatter adapter inputs as Vanilla authoring', () => {
    const plot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'people' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    } satisfies IRPlot;
    const datasets = { people: [{ x: 0, y: 1 }] };
    const reactBase = inputOf(Chart, { spec: plot, data: datasets, title: 'People' });
    const vanillaBase = createChart({ plot: { spec: plot }, datasets, title: 'People' });
    const pointInput = {
      data: datasets.people,
      width: 640,
      height: 360,
      title: 'People',
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    } satisfies CreateScatterChartInput;
    const reactScatter = inputOf(ScatterChart, pointInput);
    const vanillaScatter = createScatterChart(pointInput);
    const style = {
      axisEnabled: true,
      axisGridEnabled: true,
      legendEnabled: true,
      seriesColor: '#2563eb',
    };

    expect(reactBase.bound).toMatchObject({
      type: vanillaBase.input.bound.type,
      base: vanillaBase.input.bound.base,
      plot: vanillaBase.input.bound.plot,
    });
    expect(reactBase.bound.createPlot(style)).toEqual(vanillaBase.input.bound.createPlot(style));
    expect(reactBase.datasets).toEqual(vanillaBase.input.datasets);
    expect(reactScatter.bound).toMatchObject({
      type: vanillaScatter.input.bound.type,
      base: vanillaScatter.input.bound.base,
      plot: vanillaScatter.input.bound.plot,
    });
    expect(reactScatter.bound.createPlot(style)).toEqual(vanillaScatter.input.bound.createPlot(style));
    expect(reactScatter.datasets).toEqual(vanillaScatter.input.datasets);
  });
});
