import type { SlopeChartInputEmbedProps } from '@retikz/chart-vanilla/line';
import { slopeChart, slopeChartInputEmbedAdapter } from '@retikz/chart-vanilla/line';
import type { IRSlopeChart } from '@retikz/chart/line';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectSlopeChartDeclarations } from './declaration-collection';

/**
 * Slope Chart React 属性
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type SlopeChartProps<TNative = never> = TypedChartCommonProps<IRSlopeChart, TNative>;

/** 组装 Slope 声明并复用 Vanilla factory 的 React Chart 组件 */
export const SlopeChart = createTypedChartComponent<
  SlopeChartProps<unknown>,
  IRSlopeChart,
  SlopeChartInputEmbedProps<unknown>
>(
  'SlopeChart',
  props =>
    createTypedChartInput<SlopeChartProps<unknown>, IRSlopeChart, SlopeChartInputEmbedProps<unknown>>(
      props,
      collectSlopeChartDeclarations(props.children),
      input => slopeChart(input),
      'SlopeEncodings',
    ),
  slopeChartInputEmbedAdapter,
);
