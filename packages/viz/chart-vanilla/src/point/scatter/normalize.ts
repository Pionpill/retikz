import type { IRScatterChart } from '@retikz/chart/point/scatter';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';
import type { InputScatterChart } from './types';

/** 将 Scatter Chart Vanilla Input 组装为精确 Source IR */
export const normalizeScatterChart = (input: InputScatterChart): IRScatterChart => {
  const { title, subtitle, note, source, encodings, properties, guides, marks, ...root } = input;
  return chartSourceOf({ title, subtitle, note, source }, root, {
    type: 'point',
    data: root.data,
    ...(root.id === undefined ? {} : { id: root.id }),
    ...(root.layout === undefined ? {} : { layout: root.layout }),
    ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
    recipe: {
      chartType: 'scatter',
      encodings: normalizePointPartitionEncodings(encodings),
      ...(properties === undefined ? {} : { properties }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
  });
};
