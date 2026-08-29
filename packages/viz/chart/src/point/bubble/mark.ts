import type { IRJsonObject } from '@retikz/core';

import type { ChartMarkDefinition } from '../../_chart/contract';

import { defineChartMark } from '../../_chart/contract';
import { markSlotsOf, resolvePointMark } from '../shared/recipe';
import { BubbleChartMarkSchema } from './schema';

const bubbleDefaultProperties: IRJsonObject = {
  fillOpacity: 0.7,
  strokeWidth: 1,
};

/** 解析 Bubble Point mark，并在显式 properties 之前应用类型默认外观 */
export const resolveBubbleMark = (encodings: IRJsonObject, properties: IRJsonObject) =>
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
