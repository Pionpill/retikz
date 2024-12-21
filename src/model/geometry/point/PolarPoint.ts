import { Position } from '../../../types/coordinate/descartes';
import { PolarPosition } from '../../../types/coordinate/polar';
import DescartesPoint from './DescartesPoint';

/** 笛卡尔坐标点 */
export default class PolarPoint {
  public readonly position: PolarPosition;

  constructor(point: PolarPosition) {
    this.position = { radius: point.radius, angle: point.angle };
  }

  /** 获取笛卡尔坐标 */
  getDescartesPosition() {
    return PolarPoint.convertPolarToDescartesPosition(this.position);
  }

  /** 获取笛卡尔点 */
  getDescartesPoint() {
    return new DescartesPoint(this.getDescartesPosition());
  }

  /** 将极坐标点转换为笛卡尔坐标点 */
  static convertPolarToDescartesPosition = (position: PolarPosition) => {
    const {radius, angle } = position;
    return [radius * Math.cos(angle), radius * Math.sin(angle)] as Position;
  }
}
