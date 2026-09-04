import type { IRStripChart } from '@retikz/chart/point/strip';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Strip Chart 的精确 Vanilla Source 组装输入 */
export type InputStripChart = InputTypedChart<IRStripChart>;

/** StripChart factory 的完整输入 */
export type CreateStripChartInput = TypedChartCommonInput<IRStripChart> &
  Pick<InputStripChart, 'encodings' | 'properties' | 'marks'>;
