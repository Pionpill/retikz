import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { PointChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import { describe, expect, it } from 'vitest';

import { Chart } from '../src';
import { ScatterChart } from '../src/point';

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
  it('maps base Chart and typed Point Chart to their matching Vanilla adapters', () => {
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
    const point = inputOf(ScatterChart, {
      data: [{ x: 0, y: 1 }],
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });

    expect(Chart.inputEmbedAdapter).toBe(ChartInputEmbedAdapter);
    expect(ScatterChart.inputEmbedAdapter).toBe(PointChartInputEmbedAdapter);
    expect(chart).not.toHaveProperty('chart');
    expect(chart).toMatchObject({ plot: { spec: { data: { reference: 'people' } } } });
    expect(point).toMatchObject({ type: 'scatter' });
  });
});
