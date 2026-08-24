import { CHART_NAMESPACE } from '@retikz/chart';

import type { InputChartPresentation } from '../../normalize/chart';

import { normalizeChartPresentation } from '../../normalize/chart';

/** 组装 concrete chartType 共用的 Chart Source 外壳 */
export const chartSourceOf = (
  input: InputChartPresentation,
  root: Record<string, unknown>,
  sourceFields: Record<string, unknown>,
): Record<string, unknown> => {
  const { title, subtitle, note, source } = input;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source });
  return {
    namespace: CHART_NAMESPACE,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    ...root,
    ...sourceFields,
  };
};
