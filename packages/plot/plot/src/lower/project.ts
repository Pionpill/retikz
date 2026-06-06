import { PlotCoordinate } from '../ir';
import { isFiniteNumber } from './field';
import type { PositionScale } from './scale';

/** polar 段内采样：相邻顶点间在 [θ, r] 空间插入的固定中间点数（每段定额，连续角轴弯弧） */
export const RETIKZ_POLAR_SEGMENT_SAMPLES = 16;

/**
 * 解析后的坐标帧：lowering 算一次，mark / guide 共用同一帧（不各造临时投影框架）
 * @description grammar of graphics 的 coordinate 层：scale 把值归一化后，frame 负责归一化→2D 点。
 *   `primary` / `secondary` 是坐标系无关的两条位置 scale（cartesian = x/y、polar = angle/radius）；
 *   `project(primaryValue, secondaryValue)` 把一对原始值投影成屏幕坐标 [x, y]（非有限值返回 null，跳过该点）。
 */
export type CoordinateFrame = CartesianFrame | PolarFrame;

/** 笛卡尔帧：primary = x（水平）、secondary = y（垂直），投影直接取两条 scale 的 coordinate */
export type CartesianFrame = {
  /** 判别字段：2D 笛卡尔 */
  type: typeof PlotCoordinate.Cartesian2D;
  /** x（水平）位置 scale */
  primary: PositionScale;
  /** y（垂直）位置 scale */
  secondary: PositionScale;
  /** 投影：[primary.coordinate(x), secondary.coordinate(y)]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
};

/** 极坐标帧：primary = angle（度，range = [startAngle, endAngle]）、secondary = radius（user units，range = [innerRadius, outerRadius]） */
export type PolarFrame = {
  /** 判别字段：2D 极坐标 */
  type: typeof PlotCoordinate.Polar2D;
  /** 圆心（屏幕坐标） */
  center: [number, number];
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
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** 把已映射的极坐标对 (θ 度, r user units) 换算成屏幕点（段内采样反投影用；非有限 → null） */
  projectPolar: (thetaDeg: number, radius: number) => [number, number] | null;
};

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/** 建笛卡尔帧：primary/secondary 直接投影成 [x, y]（与早期 createCartesianProjector 行为等价） */
export const createCartesianFrame = (primary: PositionScale, secondary: PositionScale): CartesianFrame => ({
  type: PlotCoordinate.Cartesian2D,
  primary,
  secondary,
  project: (primaryValue, secondaryValue) => {
    const x = primary.coordinate(primaryValue);
    const y = secondary.coordinate(secondaryValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  },
});

/** 建极坐标帧的参数（圆心 + 内外半径 + 角向区间，均来自 layout / coordinate IR） */
export type PolarFrameSpec = {
  /** 圆心（屏幕坐标） */
  center: [number, number];
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
export const createPolarFrame = (input: PolarFrameSpec): PolarFrame => {
  const [cx, cy] = input.center;
  const projectPolar = (thetaDeg: number, radius: number): [number, number] | null => {
    if (!Number.isFinite(thetaDeg) || !Number.isFinite(radius)) return null;
    const radians = thetaDeg * DEG_TO_RAD;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
  };
  return {
    type: PlotCoordinate.Polar2D,
    center: input.center,
    innerRadius: input.innerRadius,
    outerRadius: input.outerRadius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    secondary: input.secondary,
    project: (angleValue, radiusValue) => {
      const theta = input.primary.coordinate(angleValue);
      const radius = input.secondary.coordinate(radiusValue);
      return projectPolar(theta, radius);
    },
    projectPolar,
  };
};

/** 一行的极坐标映射结果：θ（度）+ r（user units），均经 scale 映射后；任一非有限 → null（跳过该顶点） */
export type PolarVertex = { theta: number; radius: number };

/** 把一行的角向 / 径向原始值映射成 PolarVertex（非有限 → null，跳过） */
export const toPolarVertex = (frame: PolarFrame, angleValue: unknown, radiusValue: unknown): PolarVertex | null => {
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
export const densifyPolarSegments = (frame: PolarFrame, vertices: ReadonlyArray<PolarVertex>): Array<[number, number]> => {
  if (vertices.length < 2) {
    return vertices.map(v => frame.projectPolar(v.theta, v.radius)).filter((p): p is [number, number] => p !== null);
  }
  const points: Array<[number, number]> = [];
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
