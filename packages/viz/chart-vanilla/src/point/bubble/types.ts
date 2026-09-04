import type { IRBubbleChart } from '@retikz/chart/point/bubble';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Bubble Chart 的精确 Vanilla Source 组装输入 */
export type InputBubbleChart = InputTypedChart<IRBubbleChart>;

/** BubbleChart factory 的完整输入 */
export type CreateBubbleChartInput = TypedChartCommonInput<IRBubbleChart> &
  Pick<InputBubbleChart, 'encodings' | 'properties' | 'marks'>;
