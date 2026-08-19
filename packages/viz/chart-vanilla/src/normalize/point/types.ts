import type { IRBubbleChart, IRConnectedScatterChart, IRScatterChart } from '@retikz/chart/point';

import type { InputChartPresentation } from '../chart';

type InputTypedChart<TSource extends { namespace: string; type: string; config: object }> = InputChartPresentation &
  Omit<TSource, 'namespace' | 'type' | 'presentation' | 'config'> &
  TSource['config'];

/** Scatter Chart 的 Vanilla Source IR 组装输入 */
export type InputScatterChart = InputTypedChart<IRScatterChart>;

/** Bubble Chart 的 Vanilla Source IR 组装输入 */
export type InputBubbleChart = InputTypedChart<IRBubbleChart>;

/** Connected Scatter Chart 的 Vanilla Source IR 组装输入 */
export type InputConnectedScatterChart = InputTypedChart<IRConnectedScatterChart>;
