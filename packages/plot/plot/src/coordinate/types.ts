import type { Position } from '@retikz/math';
import type { ResolvedCartesian1DCoordinate, ResolvedCartesianCoordinate } from './cartesian';
import type { Cell, CellGeometry } from './cell';
import type { ResolvedCustomCoordinate } from './custom';
import type { ResolvedPolar1DCoordinate, ResolvedPolarCoordinate } from './polar';
import type { ResolvedTernary2DCoordinate } from './ternary';

/**
 * 坐标系位置角色：mark 按 frame.roles 序从 encoding 取对应通道值喂 projectRoles。
 * @description plot 层只保留 x/y/z 定位角色；polar 内部把 x 解释为角向、y 解释为径向。
 */
export type DimensionRole = 'x' | 'y' | 'z';

/**
 * 运行时坐标帧：lowering 算一次，mark / guide 共享同一帧（不各造临时投影框架）
 * @description grammar of graphics 的 coordinate 层：scale 把值归一化后，frame 负责归一化→2D 点。
 *   `roles` 是该坐标系的位置角色序；`projectRoles(values)` 按 roles 序传值投影。
 *   2 通道的 `project(primary, secondary)` 保留为便捷别名（cartesian/polar 内部 + line/area 复用）。
 *   非有限值返回 null（跳过该点）。
 */
export type ResolvedCoordinate =
  | ResolvedCartesianCoordinate
  | ResolvedPolarCoordinate
  | ResolvedCartesian1DCoordinate
  | ResolvedPolar1DCoordinate
  | ResolvedTernary2DCoordinate
  | ResolvedCustomCoordinate;

/** 具备 cell 几何投影能力的运行时坐标帧。 */
export type CellProjectableCoordinate = ResolvedCoordinate & {
  projectCell: (cell: Cell) => CellGeometry;
};

/** 判断坐标帧是否支持 interval/reference band 等 cell 类几何投影。 */
export const hasProjectCell = (coordinate: ResolvedCoordinate): coordinate is CellProjectableCoordinate => {
  const candidate = coordinate as { projectCell?: unknown };
  return typeof candidate.projectCell === 'function';
};

/**
 * 某角色轴曲线在某参数点的局部标架：原点 + 切向，均在屏幕空间。
 * @description 固定其余角色、只让某 role 变化得到一条 1D 轴曲线；`tangent`
 *   是屏幕空间原始幅值，消费方需要方向时自行归一化。
 */
export type AxisFrame = {
  /** 该点屏幕坐标。 */
  origin: Position;
  /** 沿该角色轴曲线的切向。 */
  tangent: [number, number];
};
