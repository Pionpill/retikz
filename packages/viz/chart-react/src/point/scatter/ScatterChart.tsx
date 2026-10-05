import type { ScatterChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { scatterChart, ScatterChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRScatterChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectScatterChartDeclarations } from './declaration-collection';

/**
 * ScatterChart React 根属性
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type ScatterChartProps<TNative = never> = TypedChartCommonProps<IRScatterChart, TNative>;

/** Scatter 具体类型的 Chart React 组件 */
export const ScatterChart = createTypedChartComponent<
  ScatterChartProps<unknown>,
  IRScatterChart,
  ScatterChartInputEmbedProps<unknown>
>(
  'ScatterChart',
  props =>
    createTypedChartInput<ScatterChartProps<unknown>, IRScatterChart, ScatterChartInputEmbedProps<unknown>>(
      props,
      collectScatterChartDeclarations(props.children),
      input => scatterChart(input),
      'ScatterEncodings',
    ),
  ScatterChartInputEmbedAdapter,
);
