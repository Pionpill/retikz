import type { SlopeChartInputEmbedProps } from '@retikz/chart-vanilla/line';
import { slopeChart, slopeChartInputEmbedAdapter } from '@retikz/chart-vanilla/line';
import type { IRSlopeChart } from '@retikz/chart/line';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectSlopeChartDeclarations } from './declaration-collection';

/**
 * Slope Chart React 属性
 */
export type SlopeChartProps = TypedChartCommonProps<IRSlopeChart>;

/** 组装 Slope 声明并复用 Vanilla factory 的 React Chart 组件 */
export const SlopeChart = createTypedChartComponent<SlopeChartProps, IRSlopeChart, SlopeChartInputEmbedProps>(
  'SlopeChart',
  props =>
    createTypedChartInput<SlopeChartProps, IRSlopeChart, SlopeChartInputEmbedProps>(
      props,
      collectSlopeChartDeclarations(props.children),
      input => slopeChart(input),
      'SlopeEncodings',
    ),
  slopeChartInputEmbedAdapter,
);
