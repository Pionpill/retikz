import type { IRRegressionChart } from '@retikz/chart/point/regression';
import type { CreateRegressionChartInput } from '@retikz/chart-vanilla/point/regression';

import { createRegressionChart } from '@retikz/chart-vanilla/point/regression';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectRegressionChartDeclarations } from './declaration-collection';

/** RegressionChart React 根属性 */
export type RegressionChartProps = TypedChartCommonProps<IRRegressionChart>;

/** Regression 具体类型的 Chart React 组件 */
export const RegressionChart = createTypedChartComponent<RegressionChartProps, IRRegressionChart>(
  'RegressionChart',
  props =>
    createTypedChartInput<RegressionChartProps, IRRegressionChart, CreateRegressionChartInput>(
      props,
      collectRegressionChartDeclarations(props.children),
      input => createRegressionChart(input),
      'RegressionEncodings',
    ),
);
