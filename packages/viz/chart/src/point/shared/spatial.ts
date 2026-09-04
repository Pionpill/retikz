import type { IRPlotFacetOptions, IRPlotPartitionDimension } from '@retikz/plot';

import type { ChartEncodingSpatialResolution } from '../../_chart/contract/recipe';

import { ChartEncodingSpatialKind } from '../../_chart/contract';
import { pointRecipeId } from './plot';

type PointSpatialEncodings = Readonly<{
  row?: string | IRPlotPartitionDimension | Array<IRPlotPartitionDimension>;
  column?: string | IRPlotPartitionDimension | Array<IRPlotPartitionDimension>;
  facet?: IRPlotFacetOptions;
}>;

const partitionDimensionsOf = (
  value: PointSpatialEncodings['row'],
): IRPlotPartitionDimension | Array<IRPlotPartitionDimension> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return { field: value };
  return value;
};

/** 解析具体 Point chartType 的字段分面空间配置 */
export const pointSpatialResolutionOf = (
  chartType: string,
  encodings: PointSpatialEncodings,
): ChartEncodingSpatialResolution | undefined => {
  const row = partitionDimensionsOf(encodings.row);
  const column = partitionDimensionsOf(encodings.column);
  if (row === undefined && column === undefined) return undefined;
  return {
    kind: ChartEncodingSpatialKind.Facet,
    id: pointRecipeId(chartType, 'composition.facet'),
    view: pointRecipeId(chartType, 'view.main'),
    ...(row === undefined ? {} : { row }),
    ...(column === undefined ? {} : { column }),
    options: encodings.facet ?? {},
  };
};
