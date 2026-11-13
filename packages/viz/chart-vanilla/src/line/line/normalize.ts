import type { IRLineChart } from '@retikz/chart/line';

import { chartSourceOf, normalizeChartPartitionEncodings } from '../../authoring';
import type { InputLineChart } from './types';

/** 将 Line Vanilla Input 组装为 exact Source */
export const normalizeLineChart = (input: InputLineChart): IRLineChart => {
  const { title, subtitle, note, source, encodings, properties, guides, marks, ...root } = input;
  return chartSourceOf({ title, subtitle, note, source }, root, {
    type: 'line',
    data: root.data,
    ...(root.id === undefined ? {} : { id: root.id }),
    ...(root.layout === undefined ? {} : { layout: root.layout }),
    ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
    recipe: {
      chartType: 'line',
      encodings: normalizeChartPartitionEncodings(encodings),
      ...(properties === undefined ? {} : { properties }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
  });
};
