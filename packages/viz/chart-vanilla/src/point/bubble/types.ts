import type { IRBubbleChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Bubble Chart 的精确 Vanilla Source 组装输入 */
export type InputBubbleChart = InputTypedChart<IRBubbleChart>;

/**
 * BubbleChart InputEmbed 的完整编写输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type BubbleChartInputEmbedProps<TNative = never> = TypedChartCommonInput<IRBubbleChart, TNative> &
  Pick<InputBubbleChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
