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

  static plus = (...positions: Array<Position | DescartesPosition>) => {
    return positions.reduce(
      (acc: Position, cur) =>
        Array.isArray(cur) ? [acc[0] + cur[0], acc[1] + cur[1]] : [acc[0] + cur.x, acc[1] + cur.y],
      [0, 0] as Position,
    );
  };
}
