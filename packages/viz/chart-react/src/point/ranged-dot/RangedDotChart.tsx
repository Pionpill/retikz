import type { RangedDotChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { rangedDotChart, RangedDotChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRRangedDotChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectRangedDotChartDeclarations } from './declaration-collection';

/** Ranged Dot Chart React 属性 */
export type RangedDotChartProps<TNative = never> = TypedChartCommonProps<IRRangedDotChart, TNative>;

/** 组装 Ranged Dot 声明并复用 Vanilla factory 的 React Chart 组件 */
export const RangedDotChart = createTypedChartComponent<
  RangedDotChartProps<unknown>,
  IRRangedDotChart,
  RangedDotChartInputEmbedProps<unknown>
>(
  'RangedDotChart',
  props =>
    createTypedChartInput<RangedDotChartProps<unknown>, IRRangedDotChart, RangedDotChartInputEmbedProps<unknown>>(
      props,
      collectRangedDotChartDeclarations(props.children),
      input => rangedDotChart(input),
      'RangedDotEncodings',
    ),
  RangedDotChartInputEmbedAdapter,
);
