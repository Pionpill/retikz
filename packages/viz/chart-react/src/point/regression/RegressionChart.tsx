import type { RegressionChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { regressionChart, regressionChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRRegressionChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectRegressionChartDeclarations } from './declaration-collection';

/**
 * RegressionChart React 根属性
 */
export type RegressionChartProps = TypedChartCommonProps<IRRegressionChart>;

/** Regression 具体类型的 Chart React 组件 */
export const RegressionChart = createTypedChartComponent<
  RegressionChartProps,
  IRRegressionChart,
  RegressionChartInputEmbedProps
>(
  'RegressionChart',
  props =>
    createTypedChartInput<RegressionChartProps, IRRegressionChart, RegressionChartInputEmbedProps>(
      props,
      collectRegressionChartDeclarations(props.children),
      input => regressionChart(input),
      'RegressionEncodings',
    ),
  regressionChartInputEmbedAdapter,
);
