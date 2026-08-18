import type { CenteredShape } from '../transforms';
import type { BoundsHalfAxes } from './bounds';
import type { Position } from './point';

import { localToWorld, worldToLocal } from '../transforms';

/** 椭圆：中心 + 半轴 + 可选旋转 */
export type Ellipse = CenteredShape & {
  /** 沿本地 +x 的半轴长度 */
  rx: number;
  /** 沿本地 +y 的半轴长度 */
  ry: number;
};

/** 以中心描述的矩形盒 */
export type CenteredBox = CenteredShape & {
  /** 矩形盒宽度 */
  width: number;
  /** 矩形盒高度 */
  height: number;
};

/** 椭圆外接内部盒的半轴策略 */
export type EllipseCircumscribeMode = 'proportional' | 'equal';

/** 基于中心、本地半轴和可选旋转的椭圆运算 */
export const ellipse = {
  center: (e: Ellipse): Position => [e.x, e.y],
  /** 矩形盒的内接椭圆 */
  inscribedInBox: (box: CenteredBox): Ellipse => ({
    x: box.x,
    y: box.y,
    rx: box.width / 2,
    ry: box.height / 2,
    rotate: box.rotate,
  }),
  /**
   * 包住内部盒的椭圆外接半轴
   * @description `proportional` 保持内部盒宽高比例，`equal` 使用等轴圆包住内部盒
   */
  circumscribedHalfAxes: (
    innerHalfAxes: BoundsHalfAxes,
    mode: EllipseCircumscribeMode = 'proportional',
  ): BoundsHalfAxes =>
    mode === 'equal'
      ? {
          halfWidth: Math.hypot(innerHalfAxes.halfWidth, innerHalfAxes.halfHeight),
          halfHeight: Math.hypot(innerHalfAxes.halfWidth, innerHalfAxes.halfHeight),
        }
      : {
          halfWidth: innerHalfAxes.halfWidth * Math.SQRT2,
          halfHeight: innerHalfAxes.halfHeight * Math.SQRT2,
        },
  /** 判断点是否在椭圆内，含边界 */
  contains: (e: Ellipse, p: Position): boolean => {
    if (e.rx === 0 || e.ry === 0) return false;
    const [lx, ly] = worldToLocal(e, p);
    return (lx * lx) / (e.rx * e.rx) + (ly * ly) / (e.ry * e.ry) <= 1;
  },
  /**
   * 从中心向目标方向的射线与椭圆的交点
   * @description 退化椭圆返回中心，避免零半轴除法
   */
  boundaryPoint: (e: Ellipse, toward: Position): Position => {
    if (e.rx === 0 || e.ry === 0) return [e.x, e.y];
    const [lx, ly] = worldToLocal(e, toward);
    if (lx === 0 && ly === 0) return [e.x, e.y];
    const a = lx / e.rx;
    const b = ly / e.ry;
    const t = 1 / Math.sqrt(a * a + b * b);
    return localToWorld(e, [lx * t, ly * t]);
  },
};
