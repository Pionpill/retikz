import type { RegressionChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { regressionChart, RegressionChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRRegressionChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectRegressionChartDeclarations } from './declaration-collection';

/**
 * RegressionChart React 根属性
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type RegressionChartProps<TNative = never> = TypedChartCommonProps<IRRegressionChart, TNative>;

/** Regression 具体类型的 Chart React 组件 */
export const RegressionChart = createTypedChartComponent<
  RegressionChartProps<unknown>,
  IRRegressionChart,
  RegressionChartInputEmbedProps<unknown>
>(
  'RegressionChart',
  props =>
    createTypedChartInput<RegressionChartProps<unknown>, IRRegressionChart, RegressionChartInputEmbedProps<unknown>>(
      props,
      collectRegressionChartDeclarations(props.children),
      input => regressionChart(input),
      'RegressionEncodings',
    ),
  RegressionChartInputEmbedAdapter,
);
