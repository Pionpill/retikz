import type { IRBaseChart } from '@retikz/chart';

import { BaseChartType, CHART_NAMESPACE } from '@retikz/chart';

import type { InputChart } from './types';

import { normalizeChartPresentation } from './presentation';

/** 将 Base Chart Vanilla Input 组装为 Source IR */
export const normalizeChart = (input: InputChart): IRBaseChart => {
  const { title, subtitle, note, source, presentation, ...chart } = input;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  return {
    namespace: CHART_NAMESPACE,
    type: BaseChartType.Base,
    ...chart,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
  };
};
