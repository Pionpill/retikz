import type { DescartesPosition, Position } from './descartes';
import type { PolarPosition } from './polar';

/** 点坐标的多种类型 */
export type PointPosition = Position | DescartesPosition | PolarPosition;
export type Direction = 'top' | 'bottom' | 'left' | 'right';
