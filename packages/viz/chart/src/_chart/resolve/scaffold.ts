import type { JsonObject } from '@retikz/foundation';
import type {
  IRPlot,
  IRPlotGuide,
  IRPlotScaleOperation,
  IRPlotFacetOptions,
  IRPlotPartitionDimension,
} from '@retikz/plot';
import { BuiltinPlotCoordinate, BuiltinPlotScale, PlotGuide } from '@retikz/plot';

import type {
  ChartGuideDefaultsResolveContext,
  ChartRecipeResolution,
  ChartRecipeResolveContext,
  ChartSemanticMarkResolution,
  ChartEncodingSpatialResolution,
} from '../contract';
import { ChartEncodingSpatialKind } from '../contract';
import type { IRChartRecipeGuides } from '../schemas';

/** 生成 Chart recipe 使用的稳定 Plot member identity */
export const chartRecipeId = (chartType: string, target: string): string => `__chart.${chartType}.${target}`;

/** 为 Chart recipe 建立二维笛卡尔 scaffold */
export const chartCartesian2DOf = (
  chartType: string,
): Readonly<{
  scales: readonly [IRPlotScaleOperation, IRPlotScaleOperation];
  coordinate: NonNullable<IRPlot['coordinate']>;
}> => {
  const x = chartRecipeId(chartType, 'scale.x');
  const y = chartRecipeId(chartType, 'scale.y');

  return {
    scales: [
      { type: BuiltinPlotScale.Linear, name: x },
      { type: BuiltinPlotScale.Linear, name: y },
    ],
    coordinate: { type: BuiltinPlotCoordinate.Cartesian2D, x, y },
  };
};

/** 创建 Chart recipe 的默认轴 guide
 *
 * guide 的生成开关由 Source recipe.guides 在 resolve 阶段应用
 */
export const chartAxisGuidesOf = (): ReadonlyArray<IRPlotGuide> => [
  {
    type: PlotGuide.Axis,
    dimension: 'x',
  },
  {
    type: PlotGuide.Axis,
    dimension: 'y',
  },
];
/** 生成 Chart recipe 的共享 scaffold 与 guide */
export const chartResolutionOf = (
  chartType: string,
  semanticMarks: readonly [ChartSemanticMarkResolution, ...Array<ChartSemanticMarkResolution>],
  options: Readonly<{
    scales?: ReadonlyArray<IRPlotScaleOperation>;
    guides?: ReadonlyArray<IRPlotGuide>;
  }> = {},
): ChartRecipeResolution => {
  const cartesian = chartCartesian2DOf(chartType);
  const scales = [...cartesian.scales, ...(options.scales ?? [])];
  const guides = [...chartAxisGuidesOf(), ...(options.guides ?? [])];

  return {
    scaffold: {
      scales: scales.map(value => ({ value, replaceable: true })),
      spatial: { coordinate: cartesian.coordinate, replaceable: true },
      guides: { value: guides, replaceable: true },
    },
    semanticMarks,
  };
};

/** 按 Chart recipe Source 的 guide 开关过滤默认 guide
 *
 * 显式 plotExtension.guides 已经替换 recipe scaffold 时保持其完整内容
 */
export const resolveChartGuideDefaults = (context: ChartGuideDefaultsResolveContext): ReadonlyArray<IRPlotGuide> => {
  if (context.source.plotExtension?.guides !== undefined) return context.guides;

  const options = context.source.recipe.guides as IRChartRecipeGuides | undefined;
  const axisEnabled = options?.axis ?? true;
  const grid = options?.grid;
  const legendEnabled = options?.legend ?? true;

  return context.guides.flatMap(guide => {
    if (guide.type === PlotGuide.Axis) {
      if (!axisEnabled) return [];
      if (grid === false) return [{ ...guide, grid: false }];
      if (grid === true && guide.dimension === 'y') return [{ ...guide, grid: true }];
    }

    if (guide.type === PlotGuide.Legend && !legendEnabled) return [];

    return [guide];
  });
};

/** 由 recipe context 提取通用 Chart slot */
export const chartSlotsOf = (
  context: ChartRecipeResolveContext,
): Readonly<{ encodings: JsonObject; properties: JsonObject }> => ({
  encodings: context.encodings,
  properties: context.properties,
});
type ChartSpatialEncodings = Readonly<{
  row?: string | IRPlotPartitionDimension | Array<IRPlotPartitionDimension>;
  column?: string | IRPlotPartitionDimension | Array<IRPlotPartitionDimension>;
  facet?: IRPlotFacetOptions;
}>;

const partitionDimensionsOf = (
  value: ChartSpatialEncodings['row'],
): IRPlotPartitionDimension | Array<IRPlotPartitionDimension> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return { field: value };
  return value;
};

/** 解析具体 Chart chartType 的字段分面空间配置 */
export const chartSpatialResolutionOf = (
  chartType: string,
  encodings: ChartSpatialEncodings,
): ChartEncodingSpatialResolution | undefined => {
  const row = partitionDimensionsOf(encodings.row);
  const column = partitionDimensionsOf(encodings.column);
  if (row === undefined && column === undefined) return undefined;

  return {
    kind: ChartEncodingSpatialKind.Facet,
    id: chartRecipeId(chartType, 'composition.facet'),
    view: chartRecipeId(chartType, 'view.main'),
    ...(row === undefined ? {} : { row }),
    ...(column === undefined ? {} : { column }),
    options: encodings.facet ?? {},
  };
};
