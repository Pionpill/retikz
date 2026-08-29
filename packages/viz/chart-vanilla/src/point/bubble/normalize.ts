import type { IRBubbleChart } from '@retikz/chart/point/bubble';

import { BubbleChartSchema } from '@retikz/chart/point/bubble';

import type { InputBubbleChart } from './types';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';

/** 将 Bubble Chart Vanilla Input 组装为精确 Source IR */
export const normalizeBubbleChart = (input: InputBubbleChart): IRBubbleChart => {
  const { title, subtitle, note, source, encodings, properties, marks, ...root } = input;
  return BubbleChartSchema.parse(
    chartSourceOf({ title, subtitle, note, source }, root, {
      type: 'point',
      data: root.data,
      ...(root.id === undefined ? {} : { id: root.id }),
      ...(root.theme === undefined ? {} : { theme: root.theme }),
      ...(root.layout === undefined ? {} : { layout: root.layout }),
      ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
      recipe: {
        chartType: 'bubble',
        encodings: normalizePointPartitionEncodings(encodings),
        ...(properties === undefined ? {} : { properties }),
        ...(marks === undefined ? {} : { marks }),
      },
    }),
  );
};
