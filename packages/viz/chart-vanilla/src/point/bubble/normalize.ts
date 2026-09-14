import type { IRBubbleChart } from '@retikz/chart/point/bubble';

import { chartSourceOf, normalizePointPartitionEncodings } from '../shared';
import type { InputBubbleChart } from './types';

/** 将 Bubble Chart Vanilla Input 组装为精确 Source IR */
export const normalizeBubbleChart = (input: InputBubbleChart): IRBubbleChart => {
  const { title, subtitle, note, source, encodings, properties, guides, marks, ...root } = input;
  return chartSourceOf({ title, subtitle, note, source }, root, {
    type: 'point',
    data: root.data,
    ...(root.id === undefined ? {} : { id: root.id }),
    ...(root.layout === undefined ? {} : { layout: root.layout }),
    ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
    recipe: {
      chartType: 'bubble',
      encodings: normalizePointPartitionEncodings(encodings),
      ...(properties === undefined ? {} : { properties }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
  });
};
