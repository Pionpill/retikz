import type { IRScatterChart } from '@retikz/chart/point/scatter';

import type { InputChartFacet } from '../../normalize/chart';
import type { InputTypedChart, TypedChartCommonInput } from '../shared';

/** Scatter Chart 的精确 Vanilla Source 组装输入 */
export type InputScatterChart = Omit<InputTypedChart<IRScatterChart>, 'facet'> & {
  /** Scatter recipe 的高层 facet authoring */
  facet?: InputChartFacet;
};

/** ScatterChart factory 的完整输入 */
export type CreateScatterChartInput = TypedChartCommonInput<IRScatterChart> &
  Pick<InputScatterChart, 'encodings' | 'properties' | 'facet' | 'marks'>;
