import type { ScatterChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { scatterChart, scatterChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRScatterChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectScatterChartDeclarations } from './declaration-collection';

/**
 * ScatterChart React 根属性
 */
export type ScatterChartProps = TypedChartCommonProps<IRScatterChart>;

/** Scatter 具体类型的 Chart React 组件 */
export const ScatterChart = createTypedChartComponent<ScatterChartProps, IRScatterChart, ScatterChartInputEmbedProps>(
  'ScatterChart',
  props =>
    createTypedChartInput<ScatterChartProps, IRScatterChart, ScatterChartInputEmbedProps>(
      props,
      collectScatterChartDeclarations(props.children),
      input => scatterChart(input),
      'ScatterEncodings',
    ),
  scatterChartInputEmbedAdapter,
);
