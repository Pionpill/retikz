import type { IRScatterChart } from '@retikz/chart/point/scatter';
import type { CreateScatterChartInput } from '@retikz/chart-vanilla/point/scatter';

import { createScatterChart } from '@retikz/chart-vanilla/point/scatter';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';

/** ScatterChart React 属性 */
export type ScatterChartProps = TypedChartCommonProps<IRScatterChart> &
  Pick<CreateScatterChartInput, 'encodings' | 'properties' | 'marks'>;

/** Scatter 具体类型的 Chart React 组件 */
const ScatterChartComponent = createTypedChartComponent<ScatterChartProps, IRScatterChart>('ScatterChart', props =>
  createTypedChartInput<ScatterChartProps, IRScatterChart, CreateScatterChartInput>(
    props,
    {
      encodings: props.encodings,
      ...(props.properties === undefined ? {} : { properties: props.properties }),
      ...(props.marks === undefined ? {} : { marks: props.marks }),
    },
    input => createScatterChart(input),
  ),
);

export const ScatterChart = ScatterChartComponent;

export type { ScatterMarkProps } from '../shared';
export { ScatterMark } from '../shared';
