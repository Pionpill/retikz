import { PlotCoordinate, type PlotCoordinateValue } from '../ir';

/** polar 段内采样：相邻顶点间在 [θ, r] 空间插入的固定中间点数（每段定额，连续角轴弯弧） */
export const RETIKZ_POLAR_SEGMENT_SAMPLES = 16;

/**
 * 各坐标系合法的 guide dimension 集（含别名）
 * @description axis guide 的 dimension 不在本系合法集内 → fail-loud。polar2D 在 plot 层仍使用 x/y 定位角色，
 *   坐标帧内部再解释为 angle/radius。新坐标系按自身定位维度登记。
 */
export const VALID_GUIDE_DIMENSIONS: Record<Exclude<PlotCoordinateValue, 'custom'>, ReadonlyArray<string>> = {
  [PlotCoordinate.Cartesian2D]: ['x', 'y'],
  [PlotCoordinate.Polar2D]: ['x', 'y'],
  [PlotCoordinate.Cartesian1D]: ['x'],
  [PlotCoordinate.Polar1D]: ['x'],
  [PlotCoordinate.Ternary2D]: ['x', 'y', 'z'],
};

/**
 * 各坐标系要求 mark 必填的位置角色通道
 * @description encoding 的 x/y 在 schema 转可选后，必填性下放到这里按坐标系校验、缺角色 fail-loud。
 *   sector mark 例外（角度来自累积界、无位置通道），由调用方排除。新坐标系按自身角色登记。
 */
export const REQUIRED_POSITION_CHANNELS: Record<Exclude<PlotCoordinateValue, 'custom'>, ReadonlyArray<'x' | 'y' | 'z'>> = {
  [PlotCoordinate.Cartesian2D]: ['x', 'y'],
  [PlotCoordinate.Polar2D]: ['x', 'y'],
  [PlotCoordinate.Cartesian1D]: ['x'],
  [PlotCoordinate.Polar1D]: ['x'],
  [PlotCoordinate.Ternary2D]: ['x', 'y', 'z'],
};
