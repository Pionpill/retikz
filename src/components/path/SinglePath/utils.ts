import PolarPoint from '../../../model/geometry/point/PolarPoint';
import { PointPosition } from '../../../types/coordinate';
import { DescartesPosition, Position } from '../../../types/coordinate/descartes';
import { PolarPosition } from '../../../types/coordinate/polar';

/** 将坐标格式转换为笛卡尔坐标数组形式 */
export const formatPointPosition = (point: PointPosition): Position => {
  if (Array.isArray(point)) return point;
  if (point.hasOwnProperty('x') && point.hasOwnProperty('y')) {
    const p = point as DescartesPosition;
    return [p.x, p.y];
  }
  return PolarPoint.convertPolarToDescartesPosition(point as PolarPosition);
};

/** 获取两点间的垂直点 */
export const getVerticalPoint = (point1: PointPosition, point2: PointPosition, type: '-|' | '|-'): Position => {
  const p1 = formatPointPosition(point1);
  const p2 = formatPointPosition(point2);
  return type === '-|' ? [p2[0], p1[1]] : [p1[0], p2[1]];
}