import { MarkValueKind } from '@retikz/plot';

import type { ChartRecipe } from '../../_shared';
import type { IRScatterChart } from './schema';

import { bindChartRecipe } from '../../_shared';
import { PointChartType } from '../constants';
import { createPointChartPlot } from '../shared';
import { ScatterChartSchema } from './schema';

const scatterRecipeOptions = {
  type: PointChartType.Scatter,
  finalSizeFieldOf: (spec: IRScatterChart): { field: string; scale?: string } | undefined => {
    if (spec.config.mark?.encoding?.text !== undefined) return undefined;
    if (spec.config.mark?.size?.kind === MarkValueKind.Field) {
      return {
        field: spec.config.mark.size.value,
        ...(spec.config.mark.size.scale === undefined ? {} : { scale: spec.config.mark.size.scale }),
      };
    }
    if (spec.config.mark?.size !== undefined) return undefined;
    const authoredSize = spec.config.encoding.size;
    return authoredSize?.field === undefined
      ? undefined
      : {
          field: authoredSize.field,
          ...(authoredSize.scale === undefined ? {} : { scale: authoredSize.scale }),
        };
  },
};

/** Scatter 具体类型的内建解析方案 */
export const ScatterChartRecipe: ChartRecipe<IRScatterChart> = {
  type: PointChartType.Scatter,
  schema: ScatterChartSchema,
  bind: spec => bindChartRecipe(spec, (value, style) => createPointChartPlot(value, style, scatterRecipeOptions)),
};
