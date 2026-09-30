import type { IRStripChart } from '@retikz/chart/point';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Strip Chart 的精确 Vanilla Source 组装输入 */
export type InputStripChart = InputTypedChart<IRStripChart>;

/** StripChart InputEmbed 的完整编写输入 */
export type StripChartInputEmbedProps = TypedChartCommonInput<IRStripChart> &
  Pick<InputStripChart, 'encodings' | 'properties' | 'guides' | 'marks'>;
