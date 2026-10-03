import type { IRBubbleChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Bubble Chart 的精确 Vanilla Source 组装输入 */
export type InputBubbleChart = InputTypedChart<IRBubbleChart>;

/** BubbleChart InputEmbed 的完整编写输入 */
export type BubbleChartInputEmbedProps<TNative = never> = TypedChartCommonInput<IRBubbleChart, TNative> &
  Pick<InputBubbleChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
