import type { IRSlopeChart } from '@retikz/chart/line';

import { chartSourceOf, normalizeChartPartitionEncodings } from '../../authoring';
import type { InputSlopeChart } from './types';

/** 将 Slope Vanilla Input 组装为 exact Source */
export const normalizeSlopeChart = (input: InputSlopeChart): IRSlopeChart => {
  const { title, subtitle, note, source, encodings, properties, guides, marks, ...root } = input;
  return chartSourceOf({ title, subtitle, note, source }, root, {
    type: 'line',
    data: root.data,
    ...(root.id === undefined ? {} : { id: root.id }),
    ...(root.layout === undefined ? {} : { layout: root.layout }),
    ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
    recipe: {
      chartType: 'slope',
      encodings: normalizeChartPartitionEncodings(encodings),
      ...(properties === undefined ? {} : { properties }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
  });
};
