import type { IRSlopeChart } from '@retikz/chart/line';

import type { InputTypedChart, InputChartCommon } from '../../authoring';

/** Slope exact Source 的 plain normalizer 输入 */
export type InputSlopeChart = InputTypedChart<IRSlopeChart>;

/**
 * Slope factory 的 typed authoring 输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type SlopeChartInputEmbedProps<TNative = never> = InputChartCommon<IRSlopeChart, TNative> &
  Pick<InputSlopeChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
