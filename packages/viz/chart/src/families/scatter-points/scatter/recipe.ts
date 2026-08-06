import { MarkValueKind } from '@retikz/plot';

import type { ChartRecipe } from '../../shared';
import type { IRScatterChartSpec } from './schema';

import { ChartType } from '../../../schemas';
import { createPointChartSeed, ScatterPointPatchSchema, validatePointChartCore } from '../shared';
import { ScatterChartSpecSchema } from './schema';

const scatterPointPatchPaths = Object.keys(ScatterPointPatchSchema.shape).filter(path => path !== 'encoding');

const scatterRecipeOptions = {
  type: ChartType.Scatter,
  patchPaths: scatterPointPatchPaths,
  finalSizeFieldOf: (spec: IRScatterChartSpec): { field: string; scale?: string } | undefined => {
    if (spec.mark?.encoding?.text !== undefined) return undefined;
    if (spec.mark?.size?.kind === MarkValueKind.Field) {
      return {
        field: spec.mark.size.value,
        ...(spec.mark.size.scale === undefined ? {} : { scale: spec.mark.size.scale }),
      };
    }
    if (spec.mark?.size !== undefined) return undefined;
    const authoredSize = spec.encoding.size;
    return authoredSize?.field === undefined
      ? undefined
      : {
          field: authoredSize.field,
          ...(authoredSize.scale === undefined ? {} : { scale: authoredSize.scale }),
        };
  },
};

/** Scatter canonical type 的内建 recipe */
export const ScatterChartRecipe: ChartRecipe<IRScatterChartSpec> = {
  type: ChartType.Scatter,
  schema: ScatterChartSpecSchema,
  createSeed: (spec, style) => createPointChartSeed(spec, style, scatterRecipeOptions),
  validateCore: (spec, plotSpec) => validatePointChartCore(spec, plotSpec, scatterRecipeOptions),
};
