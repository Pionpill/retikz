import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
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
});
