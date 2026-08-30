import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';
import type { CreateRangedDotChartInput } from '@retikz/chart-vanilla/point/ranged-dot';

import { createRangedDotChart } from '@retikz/chart-vanilla/point/ranged-dot';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectRangedDotChartDeclarations } from './declaration-collection';
export type RangedDotChartProps = TypedChartCommonProps<IRRangedDotChart>;
export const RangedDotChart = createTypedChartComponent<RangedDotChartProps, IRRangedDotChart>(
  'RangedDotChart',
  props =>
    createTypedChartInput<RangedDotChartProps, IRRangedDotChart, CreateRangedDotChartInput>(
      props,
      collectRangedDotChartDeclarations(props.children),
      input => createRangedDotChart(input),
    ),
);
