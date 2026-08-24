import type { IRScatterChart } from '@retikz/chart/point/scatter';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Scatter Chart 的精确 Vanilla Source 组装输入 */
export type InputScatterChart = InputTypedChart<IRScatterChart>;

/** ScatterChart factory 的完整输入 */
export type CreateScatterChartInput = TypedChartCommonInput<IRScatterChart> &
  Pick<InputScatterChart, 'encodings' | 'properties' | 'marks'>;
