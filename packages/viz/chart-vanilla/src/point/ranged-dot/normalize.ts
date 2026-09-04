import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';

import { RangedDotChartSchema } from '@retikz/chart/point/ranged-dot';

import type { InputRangedDotChart } from './types';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';

/** 将 Ranged Dot Vanilla Input 组装为 exact Source */
export const normalizeRangedDotChart = (input: InputRangedDotChart): IRRangedDotChart => {
  const { title, subtitle, note, source, encodings, properties, marks, ...root } = input;
  return RangedDotChartSchema.parse(
    chartSourceOf({ title, subtitle, note, source }, root, {
      type: 'point',
      data: root.data,
      ...(root.id === undefined ? {} : { id: root.id }),
      ...(root.theme === undefined ? {} : { theme: root.theme }),
      ...(root.layout === undefined ? {} : { layout: root.layout }),
      ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
      recipe: {
        chartType: 'ranged-dot',
        encodings: normalizePointPartitionEncodings(encodings),
        ...(properties === undefined ? {} : { properties }),
        ...(marks === undefined ? {} : { marks }),
      },
    }),
  );
};
