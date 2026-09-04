import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';

import { ConnectedScatterChartSchema } from '@retikz/chart/point/connected-scatter';

import type { InputConnectedScatterChart } from './types';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';

/** 将 Connected Scatter Vanilla Input 组装为 exact Source */
export const normalizeConnectedScatterChart = (input: InputConnectedScatterChart): IRConnectedScatterChart => {
  const { title, subtitle, note, source, encodings, properties, marks, ...root } = input;
  return ConnectedScatterChartSchema.parse(
    chartSourceOf({ title, subtitle, note, source }, root, {
      type: 'point',
      data: root.data,
      ...(root.id === undefined ? {} : { id: root.id }),
      ...(root.theme === undefined ? {} : { theme: root.theme }),
      ...(root.layout === undefined ? {} : { layout: root.layout }),
      ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
      recipe: {
        chartType: 'connected-scatter',
        encodings: normalizePointPartitionEncodings(encodings),
        ...(properties === undefined ? {} : { properties }),
        ...(marks === undefined ? {} : { marks }),
      },
    }),
  );
};
