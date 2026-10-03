import type { IRConnectedScatterChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Connected Scatter exact Source 的 plain normalizer 输入 */
export type InputConnectedScatterChart = InputTypedChart<IRConnectedScatterChart>;

/** Connected Scatter factory 的 typed authoring 输入 */
export type ConnectedScatterChartInputEmbedProps<TNative = never> = TypedChartCommonInput<
  IRConnectedScatterChart,
  TNative
> &
  Pick<InputConnectedScatterChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
