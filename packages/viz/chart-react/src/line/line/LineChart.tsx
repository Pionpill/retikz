import type { LineChartInputEmbedProps } from '@retikz/chart-vanilla/line';
import { lineChart, lineChartInputEmbedAdapter } from '@retikz/chart-vanilla/line';
import type { IRLineChart } from '@retikz/chart/line';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectLineChartDeclarations } from './declaration-collection';

/**
 * Line Chart React 属性
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type LineChartProps<TNative = never> = TypedChartCommonProps<IRLineChart, TNative>;

/** 组装 Line 声明并复用 Vanilla factory 的 React Chart 组件 */
export const LineChart = createTypedChartComponent<
  LineChartProps<unknown>,
  IRLineChart,
  LineChartInputEmbedProps<unknown>
>(
  'LineChart',
  props =>
    createTypedChartInput<LineChartProps<unknown>, IRLineChart, LineChartInputEmbedProps<unknown>>(
      props,
      collectLineChartDeclarations(props.children),
      input => lineChart(input),
      'LineEncodings',
    ),
  lineChartInputEmbedAdapter,
);
