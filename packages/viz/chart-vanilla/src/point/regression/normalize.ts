import type { IRRegressionChart } from '@retikz/chart/point/regression';

import { RegressionChartSchema } from '@retikz/chart/point/regression';

import type { InputRegressionChart } from './types';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';

/** 将 Regression Chart Vanilla Input 组装为精确 Source IR */
export const normalizeRegressionChart = (input: InputRegressionChart): IRRegressionChart => {
  const { title, subtitle, note, source, encodings, properties, marks, ...root } = input;
  return RegressionChartSchema.parse(
    chartSourceOf({ title, subtitle, note, source }, root, {
      type: 'point',
      data: root.data,
      ...(root.id === undefined ? {} : { id: root.id }),
      ...(root.theme === undefined ? {} : { theme: root.theme }),
      ...(root.layout === undefined ? {} : { layout: root.layout }),
      ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
      recipe: {
        chartType: 'regression',
        encodings: normalizePointPartitionEncodings(encodings),
        ...(properties === undefined ? {} : { properties }),
        ...(marks === undefined ? {} : { marks }),
      },
    }),
  );
};
