import type { BubbleChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { bubbleChart, BubbleChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRBubbleChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectBubbleChartDeclarations } from './declaration-collection';

/** BubbleChart React 根属性 */
export type BubbleChartProps<TNative = never> = TypedChartCommonProps<IRBubbleChart, TNative>;

/** Bubble 具体类型的 Chart React 组件 */
export const BubbleChart = createTypedChartComponent<
  BubbleChartProps<unknown>,
  IRBubbleChart,
  BubbleChartInputEmbedProps<unknown>
>(
  'BubbleChart',
  props =>
    createTypedChartInput<BubbleChartProps<unknown>, IRBubbleChart, BubbleChartInputEmbedProps<unknown>>(
      props,
      collectBubbleChartDeclarations(props.children),
      input => bubbleChart(input),
      'BubbleEncodings',
    ),
  BubbleChartInputEmbedAdapter,
);
