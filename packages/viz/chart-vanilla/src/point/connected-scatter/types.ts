import type { IRConnectedScatterChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Connected Scatter exact Source 的 plain normalizer 输入 */
export type InputConnectedScatterChart = InputTypedChart<IRConnectedScatterChart>;

/**
 * Connected Scatter factory 的 typed authoring 输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type ConnectedScatterChartInputEmbedProps<TNative = never> = TypedChartCommonInput<
  IRConnectedScatterChart,
  TNative
> &
  Pick<InputConnectedScatterChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
