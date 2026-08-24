import type { IRPlotFacetConfiguration } from '@retikz/plot';

import type { InputChartFacet } from './types';

type InputChartFacetDimension = string | NonNullable<IRPlotFacetConfiguration['row']>;

const normalizeChartFacetDimension = (
  dimension: InputChartFacetDimension | undefined,
): NonNullable<IRPlotFacetConfiguration['row']> | undefined =>
  typeof dimension === 'string' ? { field: dimension } : dimension;

/** 将 Chart facet 字段简写组装为 Plot-owned JSON 配置 */
export const normalizeChartFacet = (input: InputChartFacet): IRPlotFacetConfiguration => {
  const { row, column, ...configuration } = input;
  return {
    ...configuration,
    ...(row === undefined ? {} : { row: normalizeChartFacetDimension(row) }),
    ...(column === undefined ? {} : { column: normalizeChartFacetDimension(column) }),
  };
};
