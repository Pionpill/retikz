import type { PointMarkSchema } from '@retikz/plot';

import type { ChartRecipe } from '../recipe';
import type { IRBubbleChart } from './schema';

import { PointChartType } from '../constants';
import { BubblePointPatchSchema, createPointChartSeed, plotMarkValueOf, validatePointChartCore } from '../shared';
import { BubbleChartSchema } from './schema';

const bubblePointPatchPaths = Object.keys(BubblePointPatchSchema.shape).filter(
  path => path !== 'encoding' && path !== 'size',
);

const sameChannel = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const bubbleRecipeOptions = {
  type: PointChartType.Bubble,
  patchPaths: bubblePointPatchPaths,
  finalSizeFieldOf: (spec: IRBubbleChart): { field: string; scale?: string } => spec.encoding.size,
  validateMainMark: (spec: IRBubbleChart, mark: ReturnType<typeof PointMarkSchema.parse>): boolean =>
    mark.encoding.text === undefined && sameChannel(mark.size, plotMarkValueOf(spec.encoding.size)),
};

/** Bubble canonical type 的内建 recipe */
export const BubbleChartRecipe: ChartRecipe<IRBubbleChart> = {
  type: PointChartType.Bubble,
  schema: BubbleChartSchema,
  createSeed: (spec, style) => createPointChartSeed(spec, style, bubbleRecipeOptions),
  validateCore: (spec, plotSpec) => validatePointChartCore(spec, plotSpec, bubbleRecipeOptions),
};
