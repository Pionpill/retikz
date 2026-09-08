import type { JsonObject } from '@retikz/foundation';

import type { ChartMarkDefinition } from '../../_chart/contract';

import { defineChartMark } from '../../_chart/contract';
import { markSlotsOf, resolvePointMark } from '../shared';
import { BubbleChartMarkSchema } from './schema';

const bubbleDefaultProperties: JsonObject = {
  fillOpacity: 0.7,
  strokeWidth: 1,
};

/** 解析 Bubble Point mark，并在显式 properties 之前应用类型默认外观 */
export const resolveBubbleMark = (encodings: JsonObject, properties: JsonObject) =>
  resolvePointMark(encodings, { ...bubbleDefaultProperties, ...properties });

/** Bubble Chart 的 authored mark Definition */
export const BubbleMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'bubble',
  schema: BubbleChartMarkSchema,
  resolve: context => {
    const slots = markSlotsOf(context);
    return {
      marks: [resolveBubbleMark(slots.encodings, slots.properties)],
    };
  },
});
