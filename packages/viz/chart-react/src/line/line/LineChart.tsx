import type { LineChartInputEmbedProps } from '@retikz/chart-vanilla/line';
import { lineChart, lineChartInputEmbedAdapter } from '@retikz/chart-vanilla/line';
import type { IRLineChart } from '@retikz/chart/line';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectLineChartDeclarations } from './declaration-collection';

/**
 * Line Chart React 属性
 */
export type LineChartProps = TypedChartCommonProps<IRLineChart>;

/** 组装 Line 声明并复用 Vanilla factory 的 React Chart 组件 */
export const LineChart = createTypedChartComponent<LineChartProps, IRLineChart, LineChartInputEmbedProps>(
  'LineChart',
  props =>
    createTypedChartInput<LineChartProps, IRLineChart, LineChartInputEmbedProps>(
      props,
      collectLineChartDeclarations(props.children),
      input => lineChart(input),
      'LineEncodings',
    ),
  lineChartInputEmbedAdapter,
);
