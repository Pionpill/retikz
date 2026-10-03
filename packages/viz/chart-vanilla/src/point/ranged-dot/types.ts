import type { IRRangedDotChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Ranged Dot exact Source 的 plain normalizer 输入 */
export type InputRangedDotChart = InputTypedChart<IRRangedDotChart>;

/** Ranged Dot factory 的 typed authoring 输入 */
export type RangedDotChartInputEmbedProps<TNative = never> = TypedChartCommonInput<IRRangedDotChart, TNative> &
  Pick<InputRangedDotChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
