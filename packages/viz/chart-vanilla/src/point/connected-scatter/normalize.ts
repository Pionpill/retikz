import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';
import type { InputConnectedScatterChart } from './types';

/** 将 Connected Scatter Vanilla Input 组装为 exact Source */
export const normalizeConnectedScatterChart = (input: InputConnectedScatterChart): IRConnectedScatterChart => {
  const { title, subtitle, note, source, encodings, properties, guides, marks, ...root } = input;
  return chartSourceOf({ title, subtitle, note, source }, root, {
    type: 'point',
    data: root.data,
    ...(root.id === undefined ? {} : { id: root.id }),
    ...(root.layout === undefined ? {} : { layout: root.layout }),
    ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
    recipe: {
      chartType: 'connected-scatter',
      encodings: normalizePointPartitionEncodings(encodings),
      ...(properties === undefined ? {} : { properties }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
  });
};
