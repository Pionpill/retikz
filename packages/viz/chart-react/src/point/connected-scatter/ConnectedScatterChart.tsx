import type { ConnectedScatterChartInputEmbedProps } from '@retikz/chart-vanilla/point';
import { connectedScatterChart, ConnectedScatterChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import type { IRConnectedScatterChart } from '@retikz/chart/point';

import type { TypedChartCommonProps } from '../shared';
import { createTypedChartComponent, createTypedChartInput } from '../shared';
import { collectConnectedScatterChartDeclarations } from './declaration-collection';

/** Connected Scatter Chart React 属性 */
export type ConnectedScatterChartProps<TNative = never> = TypedChartCommonProps<IRConnectedScatterChart, TNative>;

/** 组装 Connected Scatter 声明并复用 Vanilla factory 的 React Chart 组件 */
export const ConnectedScatterChart = createTypedChartComponent<
  ConnectedScatterChartProps<unknown>,
  IRConnectedScatterChart,
  ConnectedScatterChartInputEmbedProps<unknown>
>(
  'ConnectedScatterChart',
  props =>
    createTypedChartInput<
      ConnectedScatterChartProps<unknown>,
      IRConnectedScatterChart,
      ConnectedScatterChartInputEmbedProps<unknown>
    >(
      props,
      collectConnectedScatterChartDeclarations(props.children),
      input => connectedScatterChart(input),
      'ConnectedScatterEncodings',
    ),
  ConnectedScatterChartInputEmbedAdapter,
);
