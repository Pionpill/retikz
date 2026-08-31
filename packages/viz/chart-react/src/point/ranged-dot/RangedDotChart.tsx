import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';
import type { CreateRangedDotChartInput } from '@retikz/chart-vanilla/point/ranged-dot';

import { createRangedDotChart } from '@retikz/chart-vanilla/point/ranged-dot';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectRangedDotChartDeclarations } from './declaration-collection';

/** Ranged Dot Chart React 属性 */
export type RangedDotChartProps = TypedChartCommonProps<IRRangedDotChart>;

/** 组装 Ranged Dot 声明并复用 Vanilla factory 的 React Chart 组件 */
export const RangedDotChart = createTypedChartComponent<RangedDotChartProps, IRRangedDotChart>(
  'RangedDotChart',
  props =>
    createTypedChartInput<RangedDotChartProps, IRRangedDotChart, CreateRangedDotChartInput>(
      props,
      collectRangedDotChartDeclarations(props.children),
      input => createRangedDotChart(input),
      'RangedDotEncodings',
    ),
);
