import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { Cartesian1DOrientation } from './constants';
import type {
  Cartesian1DSchema,
  CoordinateSchema,
  CustomCoordinateSchema,
  Polar1DSchema,
  Polar2DSchema,
} from './schema';

/** cartesian1D 轴向 */
export type Cartesian1DOrientationType = ValueOf<typeof Cartesian1DOrientation>;

/** 内置坐标系（cartesian2D | polar2D | cartesian1D | polar1D） */
export type IRPlotCoordinate = ZodInput<typeof CoordinateSchema>;

/** 坐标系 operation（内置 ∪ 自定义 type 开放配置） */
export type IRPlotCoordinateOperation = IRPlotCoordinate | IRPlotCustomCoordinate;

/** 一维直线坐标系（cartesian1D） */
export type IRPlotCartesian1DCoordinate = ZodInfer<typeof Cartesian1DSchema>;

/** 一维圆周坐标系（polar1D） */
export type IRPlotPolar1DCoordinate = ZodInfer<typeof Polar1DSchema>;

/** 二维极坐标系（polar2D） */
export type IRPlotPolar2DCoordinate = ZodInput<typeof Polar2DSchema>;

/** 自定义坐标系 operation（投影由运行时 CoordinateDefinition 提供） */
export type IRPlotCustomCoordinate = ZodInfer<typeof CustomCoordinateSchema>;
