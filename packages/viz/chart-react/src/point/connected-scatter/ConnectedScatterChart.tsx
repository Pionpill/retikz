import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';
import type { CreateConnectedScatterChartInput } from '@retikz/chart-vanilla/point/connected-scatter';

import { createConnectedScatterChart } from '@retikz/chart-vanilla/point/connected-scatter';

import type { TypedChartCommonProps } from '../shared';

import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectConnectedScatterChartDeclarations } from './declaration-collection';

export type ConnectedScatterChartProps = TypedChartCommonProps<IRConnectedScatterChart>;
export const ConnectedScatterChart = createTypedChartComponent<ConnectedScatterChartProps, IRConnectedScatterChart>(
  'ConnectedScatterChart',
  props =>
    createTypedChartInput<ConnectedScatterChartProps, IRConnectedScatterChart, CreateConnectedScatterChartInput>(
      props,
      collectConnectedScatterChartDeclarations(props.children),
      input => createConnectedScatterChart(input),
    ),
);
