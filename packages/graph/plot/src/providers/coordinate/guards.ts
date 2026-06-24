import type { CoordinateFrame } from '../../contract';
import { PlotCoordinate } from '../../schemas';
import type { CartesianCoordinateFrame } from './cartesian';
import type { PolarCoordinateFrame } from './polar';
import type { Ternary2DCoordinateFrame } from './ternary';

/**
 * 判断运行时坐标帧是否为内置二维笛卡尔帧。
 * @description 用于需要 primary/secondary 正交 scale、矩形 cell 或笛卡尔 guide 语义的分支；自定义 frame 即使 roles 为 x/y 也不会命中。
 */
export const isCartesianCoordinateFrame = (coordinate: CoordinateFrame): coordinate is CartesianCoordinateFrame =>
  coordinate.type === PlotCoordinate.Cartesian2D;

/**
 * 判断运行时坐标帧是否为内置二维极坐标帧。
 * @description 用于需要 polar frame 参数（center / radius / angle range）或 sector cell 语义的分支。
 */
export const isPolarCoordinateFrame = (coordinate: CoordinateFrame): coordinate is PolarCoordinateFrame =>
  coordinate.type === PlotCoordinate.Polar2D;

/**
 * 判断运行时坐标帧是否为内置三元坐标帧。
 * @description ternary2D 虽然提供 projectCell，但其 cell 构造和 simplex 裁剪不同于通用 roleScales 路径，需单独收窄。
 */
export const isTernary2DCoordinateFrame = (coordinate: CoordinateFrame): coordinate is Ternary2DCoordinateFrame =>
  coordinate.type === PlotCoordinate.Ternary2D;

/**
 * 判断运行时坐标帧是否为注册 definition 返回的通用坐标帧。
 * @description 该分支代表非内置 definition 的运行时 frame；它保留真实注册 type，并通过可选 roleScales / projectCell 声明能力。
 */
export const isGenericCoordinateFrame = (coordinate: CoordinateFrame): boolean =>
  coordinate.type !== PlotCoordinate.Cartesian2D &&
  coordinate.type !== PlotCoordinate.Polar2D &&
  coordinate.type !== PlotCoordinate.Cartesian1D &&
  coordinate.type !== PlotCoordinate.Polar1D &&
  coordinate.type !== PlotCoordinate.Ternary2D;
