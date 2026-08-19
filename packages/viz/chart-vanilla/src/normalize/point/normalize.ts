import type { IRBubbleChart, IRConnectedScatterChart, IRScatterChart } from '@retikz/chart/point';

import { CHART_NAMESPACE } from '@retikz/chart';
import { PointChartType } from '@retikz/chart/point';

import type { InputBubbleChart, InputConnectedScatterChart, InputScatterChart } from './types';

import { normalizeChartPresentation } from '../chart';

/** 将 Scatter Chart Vanilla Input 组装为精确 Source IR */
export const normalizeScatterChart = (input: InputScatterChart): IRScatterChart => {
  const { title, subtitle, note, source, presentation, encoding, mark, ...chart } = input;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  return {
    namespace: CHART_NAMESPACE,
    type: PointChartType.Scatter,
    ...chart,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    config: { encoding, ...(mark === undefined ? {} : { mark }) },
  };
};

/** 将 Bubble Chart Vanilla Input 组装为精确 Source IR */
export const normalizeBubbleChart = (input: InputBubbleChart): IRBubbleChart => {
  const { title, subtitle, note, source, presentation, encoding, mark, ...chart } = input;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  return {
    namespace: CHART_NAMESPACE,
    type: PointChartType.Bubble,
    ...chart,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    config: { encoding, ...(mark === undefined ? {} : { mark }) },
  };
};

/** 将 Connected Scatter Chart Vanilla Input 组装为精确 Source IR */
export const normalizeConnectedScatterChart = (input: InputConnectedScatterChart): IRConnectedScatterChart => {
  const { title, subtitle, note, source, presentation, encoding, mark, components, ...chart } = input;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  return {
    namespace: CHART_NAMESPACE,
    type: PointChartType.ConnectedScatter,
    ...chart,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    config: {
      encoding,
      ...(mark === undefined ? {} : { mark }),
      ...(components === undefined ? {} : { components }),
    },
  };
};
