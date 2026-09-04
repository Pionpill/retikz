import type { IRStripChart } from '@retikz/chart/point/strip';

import { StripChartSchema } from '@retikz/chart/point/strip';

import type { InputStripChart } from './types';

import { chartSourceOf } from '../shared';

/** 将 Strip Chart Vanilla Input 组装为精确 Source IR */
export const normalizeStripChart = (input: InputStripChart): IRStripChart => {
  const { title, subtitle, note, source, encodings, properties, marks, ...root } = input;
  return StripChartSchema.parse(
    chartSourceOf({ title, subtitle, note, source }, root, {
      type: 'point',
      data: root.data,
      ...(root.id === undefined ? {} : { id: root.id }),
      ...(root.theme === undefined ? {} : { theme: root.theme }),
      ...(root.layout === undefined ? {} : { layout: root.layout }),
      ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
      recipe: {
        chartType: 'strip',
        encodings,
        ...(properties === undefined ? {} : { properties }),
        ...(marks === undefined ? {} : { marks }),
      },
    }),
  );
};
