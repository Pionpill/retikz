import type { Position } from '@retikz/math';
import type { Cartesian1DCoordinateFrame, CartesianCoordinateFrame } from './cartesian';
import type { Cell, CellGeometry } from './cell';
import type { Polar1DCoordinateFrame, PolarCoordinateFrame } from './polar';
import type { Ternary2DCoordinateFrame } from './ternary';
import { PlotCoordinate } from '../ir';
import type { PositionScale } from '../scale';

/**
 * 坐标系位置角色：mark 按 frame.roles 序从 encoding 取对应通道值喂 projectRoles。
 * @description plot 层只保留 x/y/z 定位角色；polar 内部把 x 解释为角向、y 解释为径向。
 */
export type DimensionRole = 'x' | 'y' | 'z';

/**
 * 通用运行时坐标帧。
 * @description 非内置坐标系和内置坐标系共用这一能力契约；`type` 必须保持 definition 注册的真实 type，
 *   不再压成统一的 custom 判别值。投影函数由注册 definition 提供，不进入 JSON IR。
 */
export type GenericCoordinateFrame = {
  /** 坐标系注册 type；非内置坐标系使用自己的 type，例如 `bridge` / `sine`。 */
  type: string;
  /** 位置角色序（definition 消费哪些 mark 通道，按序喂 projectRoles） */
  roles: ReadonlyArray<DimensionRole>;
  /** 投影别名：任意角色数坐标系可让它委托 projectRoles；不适用时返回 null。 */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值 → 屏幕点；非有限 → null（跳过） */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /**
   * 各角色的位置 scale（definition 可选回传）：供 guide 画轴用——取该角色刻度、其余角色锚在各自 domain 起点，
   * 沿 projectRoles 密采样得曲线轴线 + 刻度点。不回传 → 该坐标系不画轴。
   */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /**
   * 某角色轴曲线在某点的局部标架（definition 可选回传）：origin + 切向 ∂γ/∂role。
   * 曲线轴优先用它取精确切向；不回传 → guide 对 projectRoles 数值差分回落（现状行为）。
   */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  /**
   * 正交 cell → CellGeometry（definition 可选回传）：实现了才支持 cell 类 mark（interval / sector / rect）。
   * @description 曲线 / 自定义 frame 自行把 cell 四边经自身几何投影密采样成 contour（用引擎 helper densifyCellContour）；
   *   不回传 → cell 类 mark 在该坐标系 fail-loud（无引擎自动兜底——「输出空间→屏幕」后段映射只有 frame 自己有）。
   */
  projectCell?: (cell: Cell) => CellGeometry;
};

/**
 * 运行时坐标帧：lowering 算一次，mark / guide 共享同一帧（不各造临时投影框架）
 * @description grammar of graphics 的 coordinate 层：scale 把值归一化后，frame 负责归一化→2D 点。
 *   `roles` 是该坐标系的位置角色序；`projectRoles(values)` 按 roles 序传值投影。
 *   2 通道的 `project(primary, secondary)` 保留为便捷别名（cartesian/polar 内部 + line/area 复用）。
 *   非有限值返回 null（跳过该点）。
 */
export type CoordinateFrame =
  | CartesianCoordinateFrame
  | PolarCoordinateFrame
  | Cartesian1DCoordinateFrame
  | Polar1DCoordinateFrame
  | Ternary2DCoordinateFrame
  | GenericCoordinateFrame;

/** 判断运行时坐标帧是否为内置二维笛卡尔帧。 */
export const isCartesianCoordinateFrame = (coordinate: CoordinateFrame): coordinate is CartesianCoordinateFrame =>
  coordinate.type === PlotCoordinate.Cartesian2D;

/** 判断运行时坐标帧是否为内置二维极坐标帧。 */
export const isPolarCoordinateFrame = (coordinate: CoordinateFrame): coordinate is PolarCoordinateFrame =>
  coordinate.type === PlotCoordinate.Polar2D;

/** 判断运行时坐标帧是否为内置三元坐标帧。 */
export const isTernary2DCoordinateFrame = (coordinate: CoordinateFrame): coordinate is Ternary2DCoordinateFrame =>
  coordinate.type === PlotCoordinate.Ternary2D;

/** 判断运行时坐标帧是否为注册 definition 返回的通用坐标帧。 */
export const isGenericCoordinateFrame = (coordinate: CoordinateFrame): coordinate is GenericCoordinateFrame =>
  coordinate.type !== PlotCoordinate.Cartesian2D &&
  coordinate.type !== PlotCoordinate.Polar2D &&
  coordinate.type !== PlotCoordinate.Cartesian1D &&
  coordinate.type !== PlotCoordinate.Polar1D &&
  coordinate.type !== PlotCoordinate.Ternary2D;

/** 具备 cell 几何投影能力的运行时坐标帧。 */
export type CellProjectableCoordinate = CoordinateFrame & {
  projectCell: (cell: Cell) => CellGeometry;
};

/** 判断坐标帧是否支持 interval/reference band 等 cell 类几何投影。 */
export const hasProjectCell = (coordinate: CoordinateFrame): coordinate is CellProjectableCoordinate => {
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
