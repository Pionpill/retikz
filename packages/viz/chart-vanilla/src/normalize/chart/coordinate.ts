import type { IRPlotCoordinateOperation } from '@retikz/plot';

import type { InputChartCoordinate } from './types';

/** 将坐标系名简写转换为 Plot coordinate operation */
export const normalizeChartCoordinate = (
  coordinate: InputChartCoordinate | undefined,
): IRPlotCoordinateOperation | undefined => (typeof coordinate === 'string' ? { type: coordinate } : coordinate);
