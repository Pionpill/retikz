import { type Position, isFiniteNumber } from '@retikz/math';
import { PlotCoordinate } from '../ir';
import { cellInterval } from './cell';
import { RETIKZ_POLAR_SEGMENT_SAMPLES } from './constants';
import type { Cell, CellGeometry } from './cell';
import type { DimensionRole } from './types';
import type { PositionScale } from '../scale/scale';

/**
 * 二维极坐标运行时坐标帧。
 * @description x 角色解释为角向、y 角色解释为径向；scale 输出先落到 [θ, r]，再投影为屏幕坐标。
 *   同时提供 projectPolar / densify 支持连续角轴上的弧线采样。
 */
export type ResolvedPolarCoordinate = {
  /** 判别字段：2D 极坐标 */
  type: typeof PlotCoordinate.Polar2D;
  /** 位置角色序（[angle, radius]）；mark 按此序取 encoding 通道值（x→angle、y→radius 别名） */
  roles: ReadonlyArray<DimensionRole>;
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 内半径（user units，环图内半径，0 = 实心） */
  innerRadius: number;
  /** 外半径（user units，可用外半径） */
  outerRadius: number;
  /** 角向起始角（度，角向 range 起） */
  startAngle: number;
  /** 角向终止角（度，角向 range 止） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；连续才在段内插值采样，分类（band / point）走弦 */
  continuousAngle: boolean;
  /** angle 位置 scale（range = [startAngle, endAngle] 度） */
  primary: PositionScale;
  /** radius 位置 scale（range = [innerRadius, outerRadius]） */
  secondary: PositionScale;
  /** 投影：θ=primary.coordinate(angle)°、r=secondary.coordinate(radius)，[cx + r·cosθ, cy + r·sinθ]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值（[angle, radius]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /** 把已映射的极坐标对 (θ 度, r user units) 换算成屏幕点（段内采样反投影用；非有限 → null） */
  projectPolar: (thetaDeg: number, radius: number) => Position | null;
  /** 正交 cell → 环楔（闭式快路）：center = frame.center、角度带 = primary、半径带 = secondary */
  projectCell: (cell: Cell) => CellGeometry;
};

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/** 创建二维极坐标运行时坐标帧所需的已解析参数。 */
export type PolarCoordinateSpec = {
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 内半径（user units） */
  innerRadius: number;
  /** 外半径（user units） */
  outerRadius: number;
  /** 角向起始角（度） */
  startAngle: number;
  /** 角向终止角（度） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；决定连续 mark 是否段内采样 */
  continuousAngle: boolean;
  /** angle 位置 scale */
  primary: PositionScale;
  /** radius 位置 scale */
  secondary: PositionScale;
};

/**
 * 建极坐标帧：投影只在 PositionScale 之上加一步极坐标→笛卡尔
 * @description θ=primary.coordinate(angleValue)（度）、r=secondary.coordinate(radiusValue)；
 *   返回 [cx + r·cos(θ°), cy + r·sin(θ°)]，屏幕 y 向下、0°=+x、90°=+y（与 core polar 约定一致）。
 */
export const createPolarCoordinate = (input: PolarCoordinateSpec): ResolvedPolarCoordinate => {
  const [cx, cy] = input.center;
  const projectPolar = (thetaDeg: number, radius: number): Position | null => {
    if (!Number.isFinite(thetaDeg) || !Number.isFinite(radius)) return null;
    const radians = thetaDeg * DEG_TO_RAD;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
  };
  const project = (angleValue: unknown, radiusValue: unknown): Position | null => {
    const theta = input.primary.coordinate(angleValue);
    const radius = input.secondary.coordinate(radiusValue);
    return projectPolar(theta, radius);
  };
  return {
    type: PlotCoordinate.Polar2D,
    roles: ['x', 'y'],
    center: input.center,
    innerRadius: input.innerRadius,
    outerRadius: input.outerRadius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    secondary: input.secondary,
    project,
    projectRoles: values => project(values[0], values[1]),
    projectPolar,
    projectCell: cell => ({
      kind: 'sector',
      center: input.center,
      innerRadius: cellInterval(cell, 'y')[0],
      outerRadius: cellInterval(cell, 'y')[1],
      startAngle: cellInterval(cell, 'x')[0],
      endAngle: cellInterval(cell, 'x')[1],
    }),
  };
};

/**
 * 一维极坐标运行时坐标帧。
 * @description 用单一角向 scale 把 x 角色投影到固定半径的圆周上；它不提供 cell 几何投影能力。
 */
export type ResolvedPolar1DCoordinate = {
  /** 判别字段：1D 极坐标圆周 */
  type: typeof PlotCoordinate.Polar1D;
  /** 位置角色序（[angle]，单通道；x→angle 别名取值） */
  roles: ReadonlyArray<DimensionRole>;
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 固定圆周半径（user units，= radius 占比 × outerRadius） */
  radius: number;
  /** 角向起始角（度，角向 range 起） */
  startAngle: number;
  /** 角向终止角（度，角向 range 止） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；连续才在段内插值采样 */
  continuousAngle: boolean;
  /** angle 位置 scale（range = [startAngle, endAngle] 度） */
  primary: PositionScale;
  /** 把已映射的极坐标对 (θ 度, r user units) 换算成屏幕点（非有限 → null） */
  projectPolar: (thetaDeg: number, radius: number) => Position | null;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([angleValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：roles 长度 1，传 [angleValue] → projectPolar(angleScale(angleValue), radius)；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
};

/** 创建一维极坐标运行时坐标帧所需的已解析参数。 */
export type Polar1DCoordinateSpec = {
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 固定圆周半径（user units） */
  radius: number;
  /** 角向起始角（度） */
  startAngle: number;
  /** 角向终止角（度） */
  endAngle: number;
  /** 角向 scale 是否连续 */
  continuousAngle: boolean;
  /** angle 位置 scale */
  primary: PositionScale;
};

/** 建一维极坐标帧：角向投影固定在半径 radius 的圆周（复用极坐标→笛卡尔换算） */
export const createPolar1DCoordinate = (input: Polar1DCoordinateSpec): ResolvedPolar1DCoordinate => {
  const [cx, cy] = input.center;
  const projectPolar = (thetaDeg: number, radius: number): Position | null => {
    if (!Number.isFinite(thetaDeg) || !Number.isFinite(radius)) return null;
    const radians = thetaDeg * DEG_TO_RAD;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
  };
  const projectRoles = (values: ReadonlyArray<unknown>): Position | null => {
    const theta = input.primary.coordinate(values[0]);
    return projectPolar(theta, input.radius);
  };
  return {
    type: PlotCoordinate.Polar1D,
    roles: ['x'],
    center: input.center,
    radius: input.radius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    projectPolar,
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
  };
};

/** 一行数据在极坐标 scale 输出空间中的顶点：θ（度）+ r（user units）。 */
export type PolarVertex = { theta: number; radius: number };

/** 把一行的角向 / 径向原始值映射成 PolarVertex（非有限 → null，跳过） */
export const toPolarVertex = (frame: ResolvedPolarCoordinate, angleValue: unknown, radiusValue: unknown): PolarVertex | null => {
  const theta = frame.primary.coordinate(angleValue);
  const radius = frame.secondary.coordinate(radiusValue);
  if (!isFiniteNumber(theta) || !isFiniteNumber(radius)) return null;
  return { theta, radius };
};

/**
 * 连续角轴段内采样：在 [θ, r] scale 输出空间线性插值，逐点反投影成屏幕弧点
 * @description 相邻顶点间插 RETIKZ_POLAR_SEGMENT_SAMPLES 个中间点（在度 + 半径空间线性，非原始数据空间），
 *   使数据空间「常半径变角」的直边在屏幕弯成弧。顶点数 < 2 时直接返回各顶点投影点（不采样）。
 */
export const densifyPolarSegments = (frame: ResolvedPolarCoordinate, vertices: ReadonlyArray<PolarVertex>): Array<Position> => {
  if (vertices.length < 2) {
    return vertices.map(v => frame.projectPolar(v.theta, v.radius)).filter((p): p is Position => p !== null);
  }
  const points: Array<Position> = [];
  const first = frame.projectPolar(vertices[0].theta, vertices[0].radius);
  if (first) points.push(first);
  for (let i = 1; i < vertices.length; i += 1) {
    const a = vertices[i - 1];
    const b = vertices[i];
    // 段内中间点 + 段终点：t 从 1/(N+1) 走到 1（含终点）
    for (let step = 1; step <= RETIKZ_POLAR_SEGMENT_SAMPLES + 1; step += 1) {
      const t = step / (RETIKZ_POLAR_SEGMENT_SAMPLES + 1);
      const theta = a.theta + (b.theta - a.theta) * t;
      const radius = a.radius + (b.radius - a.radius) * t;
      const point = frame.projectPolar(theta, radius);
      if (point) points.push(point);
    }
  }
  return points;
};
