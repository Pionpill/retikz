import type { PointMarkSchema } from '@retikz/plot';

import type { IRBubbleChartSpec } from '../../schemas';
import type { ChartRecipe } from './types';

import { BubbleChartSpecSchema, BubblePointPatchSchema, ChartType } from '../../schemas';
import { createPointChartSeed, validatePointChartCore } from './point-chart';
import { plotMarkValueOf } from './shared';

const bubblePointPatchPaths = Object.keys(BubblePointPatchSchema.shape).filter(
  path => path !== 'encoding' && path !== 'size',
);

const sameChannel = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const bubbleRecipeOptions = {
  type: ChartType.Bubble,
  patchPaths: bubblePointPatchPaths,
  finalSizeFieldOf: (spec: IRBubbleChartSpec): { field: string; scale?: string } => spec.encoding.size,
  validateMainMark: (spec: IRBubbleChartSpec, mark: ReturnType<typeof PointMarkSchema.parse>): boolean =>
    mark.encoding.text === undefined && sameChannel(mark.size, plotMarkValueOf(spec.encoding.size)),
};

/** Bubble canonical type 的内建 recipe */
export const BubbleChartRecipe: ChartRecipe<IRBubbleChartSpec> = {
  type: ChartType.Bubble,
  schema: BubbleChartSpecSchema,
  createSeed: (spec, style) => createPointChartSeed(spec, style, bubbleRecipeOptions),
  validateCore: (spec, plotSpec) => validatePointChartCore(spec, plotSpec, bubbleRecipeOptions),
};
