import type { IRSlopeChart } from '@retikz/chart/line';

import type { InputTypedChart, InputChartCommon } from '../../authoring';

/** Slope exact Source 的 plain normalizer 输入 */
export type InputSlopeChart = InputTypedChart<IRSlopeChart>;

/**
 * Slope factory 的 typed authoring 输入
 */
export type SlopeChartInputEmbedProps = InputChartCommon<IRSlopeChart> &
  Pick<InputSlopeChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
