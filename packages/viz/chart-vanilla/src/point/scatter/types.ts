import type { IRScatterChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Scatter Chart 的精确 Vanilla Source 组装输入 */
export type InputScatterChart = InputTypedChart<IRScatterChart>;

/** ScatterChart InputEmbed 的完整编写输入 */
export type ScatterChartInputEmbedProps<TNative = never> = TypedChartCommonInput<IRScatterChart, TNative> &
  Pick<InputScatterChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
