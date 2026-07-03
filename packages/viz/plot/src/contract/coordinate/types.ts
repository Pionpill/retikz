import type { Position } from '@retikz/math';

import type { PositionScale } from '../scale';
import type { Cell, CellGeometry } from './cell';

/**
 * 坐标系位置角色：mark 按 frame.roles 序从 encoding 取对应通道值喂 projectRoles。
 * @description 内置坐标系使用 x / y / z；自定义 CoordinateDefinition 可声明任意非空字符串角色。
 *   schema 只保留 JSON 形状，角色是否被坐标系支持由 definition.roles 在 lowering 阶段校验。
 */
export type DimensionRole = string;

/**
 * 运行时坐标帧的能力契约（抽象基座）。
 * @description grammar of graphics 的 coordinate 层：scale 把值归一化后，frame 负责归一化→2D 点。
 *   内置坐标系（cartesian / polar / ternary…）与自定义注册坐标系都满足这一契约——内置帧是它的结构子类型，
 *   带各自专属字段（如 primary/secondary scale），需要时由 providers 的 `isXxxCoordinateFrame` 守卫收窄。
 *   lowering 算一次，mark / guide / locator 共享同一帧；投影函数由实现/注册 definition 提供，不进入 JSON IR。
 *   `type` 保持 definition 注册的真实判别串；非有限值返回 null（跳过该点）。
 */
export type CoordinateFrame = {
  /** 坐标系注册 type；内置用其判别串（如 `cartesian2D`），自定义用自己的 type（如 `bridge` / `sine`）。 */
  type: string;
  /** 位置角色序（消费哪些 mark 通道，按序喂 projectRoles） */
  roles: ReadonlyArray<DimensionRole>;
  /** 投影别名：2 通道便捷形态，委托 projectRoles；不适用时返回 null。 */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值 → 屏幕点；非有限 → null（跳过） */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /**
   * 各角色的位置 scale（可选）：供 guide 画轴用——取该角色刻度、其余角色锚在各自 domain 起点，
   * 沿 projectRoles 密采样得曲线轴线 + 刻度点。不回传 → 该坐标系不画轴。
   */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /**
   * 某角色轴曲线在某点的局部标架（可选）：origin + 切向 ∂γ/∂role。
   * 曲线轴优先用它取精确切向；不回传 → guide 对 projectRoles 数值差分回落（现状行为）。
   */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  /**
   * 正交 cell → CellGeometry（可选）：实现了才支持 cell 类 mark（interval / sector / rect）。
   * @description 曲线 / 自定义 frame 自行把 cell 四边经自身几何投影密采样成 contour（用引擎 helper densifyCellContour）；
   *   不回传 → cell 类 mark 在该坐标系 fail-loud（无引擎自动兜底——「输出空间→屏幕」后段映射只有 frame 自己有）。
   */
  projectCell?: (cell: Cell) => CellGeometry;
};

/** 具备 cell 几何投影能力的运行时坐标帧。 */
export type CellProjectableCoordinate = CoordinateFrame & {
  projectCell: (cell: Cell) => CellGeometry;
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
