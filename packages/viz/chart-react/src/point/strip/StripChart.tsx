import type { StripChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { stripChart, StripChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRStripChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectStripChartDeclarations } from './declaration-collection';

/**
 * StripChart React 根属性
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
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
