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
  getDescartesPosition(): Position {
    const radius = this.position.radius;
    const angle = this.position.angle;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  }

  /** 获取笛卡尔点 */
  getDescartesPoint(): DescartesPoint {
    return new DescartesPoint(this.getDescartesPosition());
  }
}
