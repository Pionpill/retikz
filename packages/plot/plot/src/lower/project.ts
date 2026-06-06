import { PlotCoordinate } from '../ir';
import type { PositionScale } from './scale';

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
  /** angle 位置 scale（range = [startAngle, endAngle] 度） */
  primary: PositionScale;
  /** radius 位置 scale（range = [innerRadius, outerRadius]） */
  secondary: PositionScale;
  /** 投影：θ=primary.coordinate(angle)°、r=secondary.coordinate(radius)，[cx + r·cosθ, cy + r·sinθ]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
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
  return {
    type: PlotCoordinate.Polar2D,
    center: input.center,
    innerRadius: input.innerRadius,
    outerRadius: input.outerRadius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    primary: input.primary,
    secondary: input.secondary,
    project: (angleValue, radiusValue) => {
      const theta = input.primary.coordinate(angleValue);
      const radius = input.secondary.coordinate(radiusValue);
      if (!Number.isFinite(theta) || !Number.isFinite(radius)) return null;
      const radians = theta * DEG_TO_RAD;
      return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
    },
  };
};
