import type { IRBubbleChart } from '@retikz/chart/point';

import type { InputTypedChart, InputChartCommon } from '../../authoring';

/** Bubble Chart 的精确 Vanilla Source 组装输入 */
export type InputBubbleChart = InputTypedChart<IRBubbleChart>;

/**
 * BubbleChart InputEmbed 的完整编写输入
 */
export type BubbleChartInputEmbedProps = InputChartCommon<IRBubbleChart> &
  Pick<InputBubbleChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
