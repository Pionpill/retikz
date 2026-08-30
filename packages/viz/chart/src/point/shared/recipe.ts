import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import type {
  ChartRecipeResolution,
  ChartRecipeResolveContext,
  ChartSemanticMarkResolution,
} from '../../_chart/contract/recipe';

import { pointAxisGuidesOf, pointCartesian2DOf } from './plot';
import { PointRecipeThemeResolutionSchema } from './schema';

/** 已完成 theme fallback 的 Point recipe token */
export const pointThemeOf = (
  tokens: IRJsonObject,
): Readonly<{ axisEnabled: boolean; axisGridEnabled: boolean; legendEnabled: boolean }> =>
  PointRecipeThemeResolutionSchema.parse(tokens);

/** 生成 Point recipe 的共享 scaffold 与 guide */
export const pointResolutionOf = (
  chartType: string,
  theme: Readonly<{ axisEnabled: boolean; axisGridEnabled: boolean; legendEnabled: boolean }>,
  semanticMarks: readonly [ChartSemanticMarkResolution, ...Array<ChartSemanticMarkResolution>],
  options: Readonly<{
    scales?: ReadonlyArray<IRPlotScaleOperation>;
    guides?: ReadonlyArray<IRPlotGuide>;
    /** Point 图连续位置比例尺的 recipe 默认 domain 留白 */
    positionDomainPadding?: number;
  }> = {},
): ChartRecipeResolution => {
  const cartesian = pointCartesian2DOf(chartType, options.positionDomainPadding);
  const scales = [...cartesian.scales, ...(options.scales ?? [])];
  const guides = [...pointAxisGuidesOf(chartType, theme), ...(options.guides ?? [])];
  return {
    scaffold: {
      scales: scales.map(value => ({ value, replaceable: true })),
      spatial: { coordinate: cartesian.coordinate, replaceable: true },
      guides: { value: guides, replaceable: true },
    },
    semanticMarks,
  };
};

/** 由 recipe context 提取通用 Point slot */
export const pointSlotsOf = (
  context: ChartRecipeResolveContext,
): Readonly<{ encodings: IRJsonObject; properties: IRJsonObject }> => ({
  encodings: context.encodings,
  properties: context.properties,
});
