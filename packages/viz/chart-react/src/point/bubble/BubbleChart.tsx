import type { IRBubbleChart } from '@retikz/chart/point/bubble';
import type { CreateBubbleChartInput } from '@retikz/chart-vanilla/point/bubble';

import { createBubbleChart } from '@retikz/chart-vanilla/point/bubble';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectBubbleChartDeclarations } from './declaration-collection';

/** BubbleChart React 根属性 */
export type BubbleChartProps = TypedChartCommonProps<IRBubbleChart>;

/** Bubble 具体类型的 Chart React 组件 */
export const BubbleChart = createTypedChartComponent<BubbleChartProps, IRBubbleChart>('BubbleChart', props =>
  createTypedChartInput<BubbleChartProps, IRBubbleChart, CreateBubbleChartInput>(
    props,
    collectBubbleChartDeclarations(props.children),
    input => createBubbleChart(input),
    'BubbleEncodings',
  ),
);
