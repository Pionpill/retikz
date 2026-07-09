import type { z } from 'zod';

import type {
  Cartesian1DSchema,
  CoordinateOperationSchema,
  CoordinateSchema,
  CustomCoordinateSchema,
  Polar1DSchema,
  Ternary2DSchema,
} from './schema';

/** 内置坐标系（cartesian2D | polar2D | cartesian1D | polar1D | ternary2D） */
export type Coordinate = z.infer<typeof CoordinateSchema>;

/** 坐标系 operation（内置 ∪ 自定义 type 开放配置） */
export type CoordinateOperation = z.infer<typeof CoordinateOperationSchema>;

/** 一维直线坐标系（cartesian1D） */
export type Cartesian1DCoordinate = z.infer<typeof Cartesian1DSchema>;

/** 一维圆周坐标系（polar1D） */
export type Polar1DCoordinate = z.infer<typeof Polar1DSchema>;

/** 三元坐标系（ternary2D） */
export type Ternary2DCoordinate = z.infer<typeof Ternary2DSchema>;

/** 自定义坐标系 operation（投影由运行时 CoordinateDefinition 提供） */
export type CustomCoordinate = z.infer<typeof CustomCoordinateSchema>;
