import type { IRRegressionChart } from '@retikz/chart/point';

import type { InputTypedChart, InputChartCommon } from '../../authoring';

/** Regression Chart 的精确 Vanilla Source 组装输入 */
export type InputRegressionChart = InputTypedChart<IRRegressionChart>;

/**
 * RegressionChart InputEmbed 的完整编写输入
 */
export type RegressionChartInputEmbedProps = InputChartCommon<IRRegressionChart> &
  Pick<InputRegressionChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
