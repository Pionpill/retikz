import { PointPosition } from '../../../types/coordinate';
import { DescartesPosition, Position } from '../../../types/coordinate/descartes';
import { PolarPosition } from '../../../types/coordinate/polar';
import PolarPoint from './PolarPoint';

/** 笛卡尔坐标点 */
export default class DescartesPoint {
  public readonly position: Position;

  constructor(point: Position | DescartesPosition) {
    this.position = Array.isArray(point) ? [...point] : [point.x, point.y];
  }

  /** 获取极坐标 */
  getPolarPosition() {
    return DescartesPoint.convertPolarToDescartesPosition(this.position);
  }

  /** 获取极点 */
  getPolarPoint() {
    return new PolarPoint(this.getPolarPosition());
  }

  /** 将笛卡尔坐标点转换为极坐标点 */
  static convertPolarToDescartesPosition = (position: Position) => {
    const [x, y] = position;
    return { radius: Math.sqrt(x * x + y * y), angle: Math.atan2(y, x) } as PolarPosition;
  };

  /** 对象形式转换为数组形式 */
  static covertToPosition = (position: DescartesPosition) => {
    return [position.x, position.y];
  };

  /** 将坐标格式转换为笛卡尔坐标数组形式 */
  static formatPosition = (point: PointPosition): Position => {
    if (Array.isArray(point)) return point;
    if (point.hasOwnProperty('x') && point.hasOwnProperty('y')) {
      const p = point as DescartesPosition;
      return [p.x, p.y];
    }
    return PolarPoint.convertPolarToDescartesPosition(point as PolarPosition);
  };

  /** 多个点相加 */
  static plus = (...positions: Array<PointPosition>) => {
    return positions.reduce(
      (acc: Position, cur) => {
        const formatCur = DescartesPoint.formatPosition(cur);
        return [acc[0] + formatCur[0], acc[1] + formatCur[1]];
      },
      [0, 0] as Position,
    );
  };
}
