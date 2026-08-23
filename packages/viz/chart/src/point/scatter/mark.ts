import type { ChartMarkDefinition } from '../../_chart/contract';

import { defineChartMark } from '../../_chart/contract';
import { PointMarkSchema } from '../shared';
import { markSlotsOf, resolvePointMark } from '../shared/recipe';

/** Scatter Chart 的 authored mark Definition */
export const ScatterMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'scatter',
  schema: PointMarkSchema,
  resolve: context => {
    const slots = markSlotsOf(context);
    return {
      marks: [
        resolvePointMark(slots.encodings, slots.properties, {
          chartType: context.chartType,
          includeId: false,
        }),
      ],
    };
  },
});
