import type { IRScatterChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Scatter Chart 的精确 Vanilla Source 组装输入 */
export type InputScatterChart = InputTypedChart<IRScatterChart>;

/**
 * ScatterChart InputEmbed 的完整编写输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type ScatterChartInputEmbedProps<TNative = never> = TypedChartCommonInput<IRScatterChart, TNative> &
  Pick<InputScatterChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
