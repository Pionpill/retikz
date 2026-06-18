import type { Position } from '@retikz/math';
import type { Rect } from '../pipeline/layout';
import type { PositionScale } from '../scale/scale';
import type { Cell, CellGeometry } from './cell';
import type { AxisFrame, DimensionRole, ResolvedCoordinate } from './types';

export type CustomCoordinate = {
  /** 判别字段：自定义（运行时工厂产出，非内建坐标系） */
  type: 'custom';
  /** 位置角色序（工厂消费哪些 mark 通道，按序喂 projectRoles） */
  roles: ReadonlyArray<DimensionRole>;
  /** 投影别名：自定义须走 projectRoles（2 入参形态对任意角色数无意义），恒 null */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值 → 屏幕点；非有限 → null（跳过） */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /**
   * 各角色的位置 scale（工厂可选回传）：供 guide 画轴用——取该角色刻度、其余角色锚在各自 domain 起点，
   * 沿 projectRoles 密采样得曲线轴线 + 刻度点。不回传 → 该坐标系不画轴。
   */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /**
   * 某角色轴曲线在某点的局部标架（工厂可选回传，alpha.9 ADR-05）：origin + 切向 ∂γ/∂role。
   * 曲线轴优先用它取精确切向；不回传 → guide 对 projectRoles 数值差分回落（现状行为）。
   */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  /**
   * 正交 cell → CellGeometry（工厂可选回传，alpha.11 ADR-01）：实现了才支持 cell 类 mark（interval / sector / rect）。
   * @description 曲线 / 自定义 frame 自行把 cell 四边经自身几何投影密采样成 contour（用引擎 helper densifyCellContour）；
   *   不回传 → cell 类 mark 在该坐标系 fail-loud（无引擎自动兜底——「输出空间→屏幕」后段映射只有 frame 自己有）。
   */
  projectCell?: (cell: Cell) => CellGeometry;
};

/** createCustomCoordinate 选项（alpha.9 ADR-05）：roleScales 让 guide 画曲线轴、frameAlong 给精确切向；均可选 */
export type CreateCustomCoordinateOptions = {
  /** 各角色位置 scale；供 guide 画轴。省略 → 该坐标系无轴 */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /** 某角色轴曲线局部标架；曲线轴优先用其切向，省略 → guide 数值差分回落 */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  /** 正交 cell → CellGeometry；实现了才支持 cell 类 mark（interval / sector），省略 → cell 类 mark fail-loud */
  projectCell?: (cell: Cell) => CellGeometry;
};

/**
 * 建自定义坐标帧：把工厂给的 roles + projectRoles 包成 ResolvedCoordinate（point mark 经此投影）
 * @description 第三参 options（alpha.9 ADR-05）：roleScales 让 guide 画曲线轴、frameAlong 给精确轴切向；均可选。
 */
export const createCustomCoordinate = (
  roles: ReadonlyArray<DimensionRole>,
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null,
  options?: CreateCustomCoordinateOptions,
): CustomCoordinate => ({
  type: 'custom',
  roles,
  project: () => null,
  projectRoles,
  ...(options?.roleScales !== undefined ? { roleScales: options.roleScales } : {}),
  ...(options?.frameAlong !== undefined ? { frameAlong: options.frameAlong } : {}),
  ...(options?.projectCell !== undefined ? { projectCell: options.projectCell } : {}),
});

/**
 * 自定义坐标系工厂的上下文：画布尺寸 + 数值参数 + 角色序 + 按角色建线性位置 scale 的工具
 * @description 工厂据此组装任意投影几何（曲线、拱、螺旋…）。`linearScaleFor(role, range)` 按该角色绑定字段的
 *   数据 extent 建一条线性 scale 映到给定屏幕 range，供工厂拼装；要更复杂 scale 工厂可自行处理。
 */
export type CustomCoordinateContext = {
  /** 整图宽（user units） */
  width: number;
  /** 整图高（user units） */
  height: number;
  /** 绘图区矩形（本轮自定义坐标系给整画布、不自动收窄） */
  plotArea: Rect;
  /** label 字号 */
  fontSize: number;
  /** IR 传入的数值参数（如 archHeight），JSON 安全；键可缺省（工厂自带默认值），故值可能 undefined */
  params: Record<string, number | undefined>;
  /** 该坐标系消费的位置角色序（= IR coordinate.roles） */
  roles: ReadonlyArray<DimensionRole>;
  /** 按角色建线性位置 scale（数据 extent → 给定屏幕 range），供工厂拼装投影 */
  linearScaleFor: (role: DimensionRole, range: [number, number]) => PositionScale;
};

/** 自定义坐标系工厂：上下文 → ResolvedCoordinate（通常 createCustomCoordinate(roles, projectRoles)） */
export type CustomCoordinateFactory = (context: CustomCoordinateContext) => ResolvedCoordinate;

/** 一行的极坐标映射结果：θ（度）+ r（user units），均经 scale 映射后；任一非有限 → null（跳过该顶点） */
