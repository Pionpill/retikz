import type { InputChartCoordinate } from '@retikz/chart-vanilla';
import type { FC } from 'react';

/** Chart 坐标系声明属性 */
export type ChartCoordinateProps = Readonly<{
  /** 坐标系名简写或完整 Plot coordinate operation */
  coordinate: InputChartCoordinate;
}>;

/** 声明 Chart 根坐标系 */
export const ChartCoordinate: FC<ChartCoordinateProps> = () => null;
ChartCoordinate.displayName = 'ChartCoordinate';
