import type { IRRegressionChart } from '@retikz/chart/point/regression';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Regression Chart 的精确 Vanilla Source 组装输入 */
export type InputRegressionChart = InputTypedChart<IRRegressionChart>;

/** RegressionChart factory 的完整输入 */
export type CreateRegressionChartInput = TypedChartCommonInput<IRRegressionChart> &
  Pick<InputRegressionChart, 'encodings' | 'properties' | 'marks'>;
