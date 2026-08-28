import type { IRScatterChart } from '@retikz/chart/point/scatter';
import type { CreateScatterChartInput } from '@retikz/chart-vanilla/point/scatter';

import { createScatterChart } from '@retikz/chart-vanilla/point/scatter';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectScatterChartDeclarations } from './declaration-collection';

/** ScatterChart React 根属性 */
export type ScatterChartProps = TypedChartCommonProps<IRScatterChart>;

/** Scatter 具体类型的 Chart React 组件 */
export const ScatterChart = createTypedChartComponent<ScatterChartProps, IRScatterChart>('ScatterChart', props =>
  createTypedChartInput<ScatterChartProps, IRScatterChart, CreateScatterChartInput>(
    props,
    collectScatterChartDeclarations(props.children),
    input => createScatterChart(input),
  ),
);
