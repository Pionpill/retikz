import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { Cartesian1DOrientation, PlotCoordinate } from './constants';
import type {
  Cartesian1DSchema,
  CoordinateOperationSchema,
  CoordinateSchema,
  CustomCoordinateSchema,
  Polar1DSchema,
} from './schema';

/** 坐标系类型 */
export type PlotCoordinateValue = ValueOf<typeof PlotCoordinate>;

/** cartesian1D 轴向 */
export type Cartesian1DOrientationType = ValueOf<typeof Cartesian1DOrientation>;

/** 内置坐标系（cartesian2D | polar2D | cartesian1D | polar1D） */
export type IRPlotCoordinate = z.infer<typeof CoordinateSchema>;

/** 坐标系 operation（内置 ∪ 自定义 type 开放配置） */
export type IRPlotCoordinateOperation = z.infer<typeof CoordinateOperationSchema>;

/** 一维直线坐标系（cartesian1D） */
export type IRPlotCartesian1DCoordinate = z.infer<typeof Cartesian1DSchema>;

/** 一维圆周坐标系（polar1D） */
export type IRPlotPolar1DCoordinate = z.infer<typeof Polar1DSchema>;

/** 自定义坐标系 operation（投影由运行时 CoordinateDefinition 提供） */
export type IRPlotCustomCoordinate = z.infer<typeof CustomCoordinateSchema>;
