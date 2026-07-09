import type { Position } from '@retikz/math';

import type { PlotCoordinate } from '../../schemas';
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

/**
 * 二维极坐标运行时坐标帧。
 * @description x 角色解释为角向、y 角色解释为径向；scale 输出先落到 [theta, radius]，再投影为屏幕坐标。
 *   该结构由内置 provider 创建，但作为 mark / guide / locator 共用的运行时契约暴露在 contract 层。
 */
export type PolarCoordinateFrame = {
  /** 判别字段：2D 极坐标。 */
  type: typeof PlotCoordinate.Polar2D;

  /** 位置角色顺序（[angle, radius]）；mark 按此顺序取 encoding 通道值。 */
  roles: ReadonlyArray<DimensionRole>;

  /** 圆心（屏幕坐标）。 */
  center: Position;

  /** 内半径（user units，环图内半径；0 = 实心）。 */
  innerRadius: number;

  /** 外半径（user units，可用外半径）。 */
  outerRadius: number;

  /** 角向起始角（度，角向 range 起点）。 */
  startAngle: number;

  /** 角向终止角（度，角向 range 终点）。 */
  endAngle: number;

  /** 角向 scale 是否连续；连续时 path 可做段内采样。 */
  continuousAngle: boolean;

  /** angle 位置 scale（range = [startAngle, endAngle] 度）。 */
  primary: PositionScale;

  /** radius 位置 scale（range = [innerRadius, outerRadius]）。 */
  secondary: PositionScale;

  /** 按通用 coordinate contract 暴露各 role 的位置 scale。 */
  roleScales: Partial<Record<DimensionRole, PositionScale>>;

  /** 投影：[theta, radius] -> 屏幕点；任一非有限值返回 null。 */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;

  /** N 通道投影：按 roles 顺序传值，内部委托 project。 */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;

  /** 把已映射的极坐标对（theta 度, radius user units）换算成屏幕点。 */
  projectPolar: (thetaDeg: number, radius: number) => Position | null;

  /** 正交 cell -> 环扇几何。 */
  projectCell: (cell: Cell) => CellGeometry;
};

/** 具备 cell 几何投影能力的运行时坐标帧。 */
export type CellProjectableCoordinate = CoordinateFrame & {
  projectCell: (cell: Cell) => CellGeometry;
};

/** 三元坐标三角顶点顺序（屏幕坐标）：[Vx(x=100%), Vy(y=100%), Vz(z=100%)]。 */
export type TernaryVertices = [Position, Position, Position];

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
