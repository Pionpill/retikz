import { localToWorld, worldToLocal } from './_transform';
import type { Position } from './point';
import type { RectAnchor } from './rect';

/** 椭圆：中心 + 半长轴 rx / 半短轴 ry + 可选旋转 */
export type Ellipse = {
  x: number;
  y: number;
  /** 沿本地 +x */
  rx: number;
  /** 沿本地 +y */
  ry: number;
  /** 绕中心旋转弧度 */
  rotate?: number;
};

const SQRT_HALF = Math.SQRT1_2;

/** 椭圆相关基础工具 */
export const ellipse = {
  /** 中心 */
  center: (e: Ellipse): Position => [e.x, e.y],
  /** 判断点是否在椭圆内（含边界，考虑旋转） */
  contains: (e: Ellipse, p: Position): boolean => {
    const [lx, ly] = worldToLocal(e, p);
    return (lx * lx) / (e.rx * e.rx) + (ly * ly) / (e.ry * e.ry) <= 1;
  },
/**
 * 9 个 anchor 的世界坐标
 * @description 对角（NE/NW/SE/SW）取参数曲线 t=π/4 处 (rx/√2, ry/√2)，与 TikZ 椭圆 anchor 参数等分约定一致
 */
  anchor: (e: Ellipse, name: RectAnchor): Position => {
    let lx = 0;
    let ly = 0;
    switch (name) {
      case 'center':
        break;
      case 'north':
        ly = -e.ry;
        break;
      case 'south':
        ly = e.ry;
        break;
      case 'east':
        lx = e.rx;
        break;
      case 'west':
        lx = -e.rx;
        break;
      case 'north-east':
        lx = e.rx * SQRT_HALF;
        ly = -e.ry * SQRT_HALF;
        break;
      case 'north-west':
        lx = -e.rx * SQRT_HALF;
        ly = -e.ry * SQRT_HALF;
        break;
      case 'south-east':
        lx = e.rx * SQRT_HALF;
        ly = e.ry * SQRT_HALF;
        break;
      case 'south-west':
        lx = -e.rx * SQRT_HALF;
        ly = e.ry * SQRT_HALF;
        break;
    }
    return localToWorld(e, [lx, ly]);
  },
/**
 * 从中心向 toward 方向射线与椭圆交点
 * @description 椭圆方程 (x/rx)² + (y/ry)² = 1；沿 (lx,ly) 缩放 t 倍命中 t = 1 / √((lx/rx)² + (ly/ry)²)
 */
  boundaryPoint: (e: Ellipse, toward: Position): Position => {
    const [lx, ly] = worldToLocal(e, toward);
    if (lx === 0 && ly === 0) return [e.x, e.y];
    const a = lx / e.rx;
    const b = ly / e.ry;
    const t = 1 / Math.sqrt(a * a + b * b);
    return localToWorld(e, [lx * t, ly * t]);
  },
};
