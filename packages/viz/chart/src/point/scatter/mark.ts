import type { ChartMarkDefinition } from '../../_chart/contract';

import { defineChartMark } from '../../_chart/contract';
import { markSlotsOf, resolvePointMark } from '../shared/recipe';
import { ScatterChartMarkSchema } from './schema';

/** Scatter Chart 的 authored mark Definition */
export const ScatterMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'scatter',
  schema: ScatterChartMarkSchema,
  resolve: context => {
    const slots = markSlotsOf(context);
    return {
      marks: [resolvePointMark(slots.encodings, slots.properties)],
    };
  },
});
