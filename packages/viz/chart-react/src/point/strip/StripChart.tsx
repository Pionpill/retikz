import type { IRStripChart } from '@retikz/chart/point/strip';
import type { CreateStripChartInput } from '@retikz/chart-vanilla/point/strip';

import { createStripChart } from '@retikz/chart-vanilla/point/strip';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectStripChartDeclarations } from './declaration-collection';

/** StripChart React 根属性 */
export type StripChartProps = TypedChartCommonProps<IRStripChart>;

/** Strip 具体类型的 Chart React 组件 */
export const StripChart = createTypedChartComponent<StripChartProps, IRStripChart>('StripChart', props =>
  createTypedChartInput<StripChartProps, IRStripChart, CreateStripChartInput>(
    props,
    collectStripChartDeclarations(props.children),
    input => createStripChart(input),
    'StripEncodings',
  ),
);
