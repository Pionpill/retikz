import type { BubbleChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { bubbleChart, bubbleChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRBubbleChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../../authoring';
import { createTypedChartComponent, createTypedChartInput } from '../../authoring';
import { collectBubbleChartDeclarations } from './declaration-collection';

/**
 * BubbleChart React 根属性
 */
export type BubbleChartProps = TypedChartCommonProps<IRBubbleChart>;

/** Bubble 具体类型的 Chart React 组件 */
export const BubbleChart = createTypedChartComponent<BubbleChartProps, IRBubbleChart, BubbleChartInputEmbedProps>(
  'BubbleChart',
  props =>
    createTypedChartInput<BubbleChartProps, IRBubbleChart, BubbleChartInputEmbedProps>(
      props,
      collectBubbleChartDeclarations(props.children),
      input => bubbleChart(input),
      'BubbleEncodings',
    ),
  bubbleChartInputEmbedAdapter,
);
