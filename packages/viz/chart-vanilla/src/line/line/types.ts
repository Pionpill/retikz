import type { IRLineChart } from '@retikz/chart/line';

import type { InputTypedChart, InputChartCommon } from '../../authoring';

/** Line exact Source 的 plain normalizer 输入 */
export type InputLineChart = InputTypedChart<IRLineChart>;

/**
 * Line factory 的 typed authoring 输入
 */
export type LineChartInputEmbedProps = InputChartCommon<IRLineChart> &
  Pick<InputLineChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
