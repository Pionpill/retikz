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
    return DescartesPoint.convertPolarToDescartesPosition(this.position)
  }

  /** 获取极点 */
  getPolarPoint() {
    return new PolarPoint(this.getPolarPosition());
  }

  /** 将笛卡尔坐标点转换为极坐标点 */
  static convertPolarToDescartesPosition = (position: Position) => {
    const [x, y] = position;
    return { radius: Math.sqrt(x * x + y * y), angle: Math.atan2(y, x) } as PolarPosition;
  }
}
