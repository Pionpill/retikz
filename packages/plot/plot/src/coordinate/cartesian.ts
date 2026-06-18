import { Cartesian1DOrientation, type Cartesian1DOrientationType, PlotCoordinate } from '../ir';
import { cellInterval } from './cell';
import type { Cell, CellGeometry } from './cell';
import type { DimensionRole } from './types';
import type { PositionScale } from '../scale/scale';

export type CartesianCoordinate = {
  /** 判别字段：2D 笛卡尔 */
  type: typeof PlotCoordinate.Cartesian2D;
  /** 位置角色序（[x, y]）；mark 按此序取 encoding 通道值 */
  roles: ReadonlyArray<DimensionRole>;
  /** x（水平）位置 scale */
  primary: PositionScale;
  /** y（垂直）位置 scale */
  secondary: PositionScale;
  /** 投影：[primary.coordinate(x), secondary.coordinate(y)]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：按 roles 序传值（[x, y]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  /** 正交 cell → 轴对齐矩形（闭式快路）：position = 两区间中点、width/height = 区间跨度 */
  projectCell: (cell: Cell) => CellGeometry;
};

/** 极坐标帧：primary = angle（度，range = [startAngle, endAngle]）、secondary = radius（user units，range = [innerRadius, outerRadius]） */

export const createCartesianCoordinate = (primary: PositionScale, secondary: PositionScale): CartesianCoordinate => {
  const project = (primaryValue: unknown, secondaryValue: unknown): [number, number] | null => {
    const x = primary.coordinate(primaryValue);
    const y = secondary.coordinate(secondaryValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  };
  return {
    type: PlotCoordinate.Cartesian2D,
    roles: ['x', 'y'],
    primary,
    secondary,
    project,
    projectRoles: values => project(values[0], values[1]),
    projectCell: cell => {
      const [px0, px1] = cellInterval(cell, 'x');
      const [sy0, sy1] = cellInterval(cell, 'y');
      return {
        kind: 'rect',
        position: [(px0 + px1) / 2, (sy0 + sy1) / 2],
        width: Math.abs(px1 - px0),
        height: Math.abs(sy1 - sy0),
      };
    },
  };
};

export type ResolvedCartesian1DCoordinate = {
  /** 判别字段：1D 笛卡尔直线 */
  type: typeof PlotCoordinate.Cartesian1D;
  /** 位置角色序（[x]，单通道） */
  roles: ReadonlyArray<DimensionRole>;
  /** 轴向（horizontal 沿 x、vertical 沿 y） */
  orientation: Cartesian1DOrientationType;
  /** 塌缩维固定基线（horizontal=底边屏幕 y、vertical=左边屏幕 x） */
  baseline: number;
  /** 单一位置 scale */
  primary: PositionScale;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([primaryValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：roles 长度 1，传 [value] → horizontal [scale(v), baseline] / vertical [baseline, scale(v)]；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  /** 1D 坐标系无 2D 正交 cell 概念，不实现 projectCell（cell 类 mark fail-loud；声明可选以统一 union 访问） */
  projectCell?: undefined;
};

/** 建一维笛卡尔帧：单 scale + 轴向 + 塌缩维基线（horizontal → [scale(v), baseline]、vertical → [baseline, scale(v)]） */
export const createCartesian1DCoordinate = (scale: PositionScale, orientation: Cartesian1DOrientationType, baseline: number): ResolvedCartesian1DCoordinate => {
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const position = scale.coordinate(values[0]);
    if (!Number.isFinite(position)) return null;
    // horizontal：数据沿 x、塌缩 y=baseline（底边）；vertical：数据沿 y、塌缩 x=baseline（左边）
    return orientation === Cartesian1DOrientation.Horizontal ? [position, baseline] : [baseline, position];
  };
  return {
    type: PlotCoordinate.Cartesian1D,
    roles: ['x'],
    orientation,
    baseline,
    primary: scale,
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
  };
};

/** 建一维极坐标帧的参数（圆心 + 固定半径 + 角向区间 + angle scale） */
