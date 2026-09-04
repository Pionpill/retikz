import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Connected Scatter exact Source 的 plain normalizer 输入 */
export type InputConnectedScatterChart = InputTypedChart<IRConnectedScatterChart>;

/** Connected Scatter factory 的 typed authoring 输入 */
export type CreateConnectedScatterChartInput = TypedChartCommonInput<IRConnectedScatterChart> &
  Pick<InputConnectedScatterChart, 'encodings' | 'properties' | 'marks'>;
