import type { JsonObject } from '@retikz/foundation';
import type { IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { PlotGuide } from '@retikz/plot';

import type { ChartGuideDefaultsResolveContext } from '../../_chart/contract';
import type {
  ChartRecipeResolution,
  ChartRecipeResolveContext,
  ChartSemanticMarkResolution,
} from '../../_chart/contract/recipe';
import type { IRPointRecipeGuides } from './schema';

import { pointAxisGuidesOf, pointCartesian2DOf } from './plot';

/** 生成 Point recipe 的共享 scaffold 与 guide */
export const pointResolutionOf = (
  chartType: string,
  semanticMarks: readonly [ChartSemanticMarkResolution, ...Array<ChartSemanticMarkResolution>],
  options: Readonly<{
    scales?: ReadonlyArray<IRPlotScaleOperation>;
    guides?: ReadonlyArray<IRPlotGuide>;
  }> = {},
): ChartRecipeResolution => {
  const cartesian = pointCartesian2DOf(chartType);
  const scales = [...cartesian.scales, ...(options.scales ?? [])];
  const guides = [...pointAxisGuidesOf(), ...(options.guides ?? [])];
  return {
    scaffold: {
      scales: scales.map(value => ({ value, replaceable: true })),
      spatial: { coordinate: cartesian.coordinate, replaceable: true },
      guides: { value: guides, replaceable: true },
    },
    semanticMarks,
  };
};

/** 按 Point recipe Source 的 guide 开关过滤默认 guide
 *
 * 显式 plotExtension.guides 已经替换 recipe scaffold 时保持其完整内容
 */
export const resolvePointGuideDefaults = (context: ChartGuideDefaultsResolveContext): ReadonlyArray<IRPlotGuide> => {
  if (context.source.plotExtension?.guides !== undefined) return context.guides;

  const options = context.source.recipe.guides as IRPointRecipeGuides | undefined;
  const axisEnabled = options?.axis ?? true;
  const gridEnabled = options?.grid ?? true;
  const legendEnabled = options?.legend ?? true;

  return context.guides.flatMap(guide => {
    if (guide.type === PlotGuide.Axis) {
      if (!axisEnabled) return [];
      if (!gridEnabled && Object.hasOwn(guide, 'grid')) {
        const { grid: _grid, ...withoutGrid } = guide;
        void _grid;
        return [withoutGrid];
      }
    }
    if (guide.type === PlotGuide.Legend && !legendEnabled) return [];
    return [guide];
  });
};

/** 由 recipe context 提取通用 Point slot */
export const pointSlotsOf = (
  context: ChartRecipeResolveContext,
): Readonly<{ encodings: JsonObject; properties: JsonObject }> => ({
  encodings: context.encodings,
  properties: context.properties,
});
