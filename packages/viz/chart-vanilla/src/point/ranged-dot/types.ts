import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';

import type { InputTypedChart, TypedChartCommonInput } from '../shared';
export type InputRangedDotChart = InputTypedChart<IRRangedDotChart>;
export type CreateRangedDotChartInput = TypedChartCommonInput<IRRangedDotChart> &
  Pick<InputRangedDotChart, 'encodings' | 'properties' | 'marks'>;
