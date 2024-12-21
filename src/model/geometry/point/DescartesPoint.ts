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
  getPolarPosition(): PolarPosition {
    const [x, y] = this.position;
    return { radius: Math.sqrt(x * x + y * y), angle: Math.atan2(y, x) };
  }

  /** 获取极点 */
  getPolarPoint(): PolarPoint {
    return new PolarPoint(this.getPolarPosition());
  }
}
