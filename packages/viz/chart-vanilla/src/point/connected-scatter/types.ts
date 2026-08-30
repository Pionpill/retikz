import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';
export type InputConnectedScatterChart = InputTypedChart<IRConnectedScatterChart>;
export type CreateConnectedScatterChartInput = TypedChartCommonInput<IRConnectedScatterChart> &
  Pick<InputConnectedScatterChart, 'encodings' | 'properties' | 'marks'>;
