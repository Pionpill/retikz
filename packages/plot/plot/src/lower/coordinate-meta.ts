import { type CoordinateType, PlotCoordinate } from '../ir';

/**
 * 各坐标系合法的 guide dimension 集（含别名）
 * @description axis guide 的 dimension 不在本系合法集内 → fail-loud（修 cross-review P2 的杂散轴线）。
 *   polar2D 含 alpha.4 留的 x/y 别名（x→angle、y→radius，勿删）。新坐标系按自身定位维度登记。
 */
export const VALID_GUIDE_DIMENSIONS: Record<CoordinateType, ReadonlyArray<string>> = {
  [PlotCoordinate.Cartesian2D]: ['x', 'y'],
  [PlotCoordinate.Polar2D]: ['angle', 'radius', 'x', 'y'],
  [PlotCoordinate.Cartesian1D]: ['x'],
  [PlotCoordinate.Polar1D]: ['angle', 'x'],
};

/**
 * 各坐标系要求 mark 必填的位置角色通道
 * @description encoding 的 x/y 在 schema 转可选后，必填性下放到这里按坐标系校验、缺角色 fail-loud。
 *   sector mark 例外（角度来自累积界、无位置通道），由调用方排除。新坐标系按自身角色登记。
 */
export const REQUIRED_POSITION_CHANNELS: Record<CoordinateType, ReadonlyArray<'x' | 'y' | 'a' | 'b' | 'c'>> = {
  [PlotCoordinate.Cartesian2D]: ['x', 'y'],
  [PlotCoordinate.Polar2D]: ['x', 'y'],
  [PlotCoordinate.Cartesian1D]: ['x'],
  [PlotCoordinate.Polar1D]: ['x'],
};
