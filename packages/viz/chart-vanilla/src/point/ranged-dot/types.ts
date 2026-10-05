import type { IRRangedDotChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Ranged Dot exact Source 的 plain normalizer 输入 */
export type InputRangedDotChart = InputTypedChart<IRRangedDotChart>;

/**
 * Ranged Dot factory 的 typed authoring 输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type RangedDotChartInputEmbedProps<TNative = never> = TypedChartCommonInput<IRRangedDotChart, TNative> &
  Pick<InputRangedDotChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
