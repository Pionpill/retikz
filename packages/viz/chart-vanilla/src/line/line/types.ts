import type { IRLineChart } from '@retikz/chart/line';

import type { InputTypedChart, InputChartCommon } from '../../authoring';

/** Line exact Source 的 plain normalizer 输入 */
export type InputLineChart = InputTypedChart<IRLineChart>;

/**
 * Line factory 的 typed authoring 输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type LineChartInputEmbedProps<TNative = never> = InputChartCommon<IRLineChart, TNative> &
  Pick<InputLineChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
