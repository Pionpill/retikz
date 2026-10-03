import type { StripChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { stripChart, StripChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRStripChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectStripChartDeclarations } from './declaration-collection';

/** StripChart React 根属性 */
export type StripChartProps<TNative = never> = TypedChartCommonProps<IRStripChart, TNative>;

/** Strip 具体类型的 Chart React 组件 */
export const StripChart = createTypedChartComponent<
  StripChartProps<unknown>,
  IRStripChart,
  StripChartInputEmbedProps<unknown>
>(
  'StripChart',
  props =>
    createTypedChartInput<StripChartProps<unknown>, IRStripChart, StripChartInputEmbedProps<unknown>>(
      props,
      collectStripChartDeclarations(props.children),
      input => stripChart(input),
      'StripEncodings',
    ),
  StripChartInputEmbedAdapter,
);
