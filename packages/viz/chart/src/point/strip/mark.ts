import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import { PlotPositionAdjustment, PointMarkSchema } from '@retikz/plot';

import type { ChartMarkDefinition } from '../../_chart/contract';
import type { IRStripChartJitter } from './schema';

import { defineChartMark } from '../../_chart/contract';
import { markSlotsOf, resolvePointMark } from '../shared';
import { StripChartMarkSchema } from './schema';

/** 把 Strip jitter shorthand 下沉到 Plot Point placement */
export const resolveStripPointMark = (
  encodings: IRJsonObject,
  properties: IRJsonObject & Readonly<{ jitter?: IRStripChartJitter }>,
): IRPlotMarkOperation => {
  const point = resolvePointMark(encodings, properties);
  const jitter = properties.jitter;
  return PointMarkSchema.parse({
    ...point,
    placement: {
      adjustments: [
        {
          kind: PlotPositionAdjustment.Jitter,
          ...(jitter === undefined ? {} : jitter),
        },
      ],
    },
  });
};

/** Strip Chart 的 authored mark Definition */
export const StripMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'strip',
  schema: StripChartMarkSchema,
  resolve: context => {
    const slots = markSlotsOf(context);
    return {
      marks: [resolveStripPointMark(slots.encodings, slots.properties)],
    };
  },
});
