import { PlotCoordinate } from '../ir';
import { z } from 'zod';
import type { CartesianCoordinateFrame } from './cartesian';
import type { PolarCoordinateFrame } from './polar';
import type { Ternary2DCoordinateFrame } from './ternary';
import type { CellProjectableCoordinate, CoordinateFrame, GenericCoordinateFrame } from './types';

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
export const isGenericCoordinateFrame = (coordinate: CoordinateFrame): coordinate is GenericCoordinateFrame =>
  coordinate.type !== PlotCoordinate.Cartesian2D &&
  coordinate.type !== PlotCoordinate.Polar2D &&
  coordinate.type !== PlotCoordinate.Cartesian1D &&
  coordinate.type !== PlotCoordinate.Polar1D &&
  coordinate.type !== PlotCoordinate.Ternary2D;

/**
 * 判断坐标帧是否支持 cell 类几何投影。
 * @description interval、reference band 等 mark 先构造逻辑 Cell，再要求 frame.projectCell 把 Cell 投成 rect / sector / contour。
 *   这个 guard 只表示“能投 cell”，不表示 mark 侧一定能构造 cell；自定义 interval 仍需要 roleScales。
 */
export const hasProjectCell = (coordinate: CoordinateFrame): coordinate is CellProjectableCoordinate => {
  const candidate = coordinate as { projectCell?: unknown };
  return typeof candidate.projectCell === 'function';
};

/**
 * 从 coordinate definition schema 中提取 registry key。
 * @description definition schema 必须是包含 `type: z.literal('<coordinate-type>')` 的 ZodObject；
 *   该 literal 值就是 IR 中 `coordinate.type` 的真实判别串，也是 registry 的唯一键。
 */
export const extractCoordinateType = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('lowerPlots: coordinate registration schema must be a ZodObject with a literal type field');
  }
  const typeSchema = schema.shape.type;
  if (!(typeSchema instanceof z.ZodLiteral) || typeof typeSchema.value !== 'string' || typeSchema.value.length === 0) {
    throw new Error('lowerPlots: coordinate registration schema must declare type as a non-empty z.literal string');
  }
  return typeSchema.value;
};
