import PolarPoint from '../../../model/geometry/point/PolarPoint';
import { PointPosition } from '../../../types/coordinate';
import { DescartesPosition, Position } from '../../../types/coordinate/descartes';
import { PolarPosition } from '../../../types/coordinate/polar';

export const formatPointPosition = (point: PointPosition): Position => {
  if (Array.isArray(point)) return point;
  if (point.hasOwnProperty('x') && point.hasOwnProperty('y')) {
    const p = point as DescartesPosition;
    return [p.x, p.y];
  }
  return PolarPoint.convertPolarToDescartesPosition(point as PolarPosition);
};
