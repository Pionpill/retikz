import type { IRScatterChart } from '@retikz/chart/point/scatter';

import { ScatterChartSchema } from '@retikz/chart/point/scatter';

import type { InputScatterChart } from './types';

import { normalizeChartFacet } from '../../normalize/chart';
import { chartSourceOf } from '../shared';

/** 将 Scatter Chart Vanilla Input 组装为精确 Source IR */
export const normalizeScatterChart = (input: InputScatterChart): IRScatterChart => {
  const { title, subtitle, note, source, encodings, properties, facet, marks, ...root } = input;
  return ScatterChartSchema.parse(
    chartSourceOf({ title, subtitle, note, source }, root, {
      type: 'point',
      data: root.data,
      ...(root.id === undefined ? {} : { id: root.id }),
      ...(root.theme === undefined ? {} : { theme: root.theme }),
      ...(root.layout === undefined ? {} : { layout: root.layout }),
      ...(root.plotExtension === undefined ? {} : { plotExtension: root.plotExtension }),
      recipe: {
        chartType: 'scatter',
        encodings,
        ...(properties === undefined ? {} : { properties }),
        ...(facet === undefined ? {} : { facet: normalizeChartFacet(facet) }),
        ...(marks === undefined ? {} : { marks }),
      },
    }),
  );
};
