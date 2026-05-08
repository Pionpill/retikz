import type { Position } from './point';

/** 椭圆：几何中心 (x, y) + 半长轴 rx / 半短轴 ry + 可选旋转（弧度） */
export type Ellipse = {
  /** 中心横坐标 */
  x: number;
  /** 中心纵坐标 */
  y: number;
  /** 半长轴（沿本地 +x 方向） */
  rx: number;
  /** 半短轴（沿本地 +y 方向） */
  ry: number;
  /** 绕几何中心旋转弧度；省略或 0 表示不旋转 */
  rotate?: number;
};

const SQRT_HALF = Math.SQRT1_2;

/** 椭圆 9 个标准 anchor 名（含义与 RECT_ANCHORS 一致） */
export type EllipseAnchor =
  | 'center'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west';

const localToWorld = (e: Ellipse, local: Position): Position => {
  const angle = e.rotate ?? 0;
  if (angle === 0) return [e.x + local[0], e.y + local[1]];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [e.x + local[0] * cos - local[1] * sin, e.y + local[0] * sin + local[1] * cos];
};

const worldToLocal = (e: Ellipse, world: Position): Position => {
  const tx = world[0] - e.x;
  const ty = world[1] - e.y;
  const angle = e.rotate ?? 0;
  if (angle === 0) return [tx, ty];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [tx * cos + ty * sin, -tx * sin + ty * cos];
};

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
   * 9 个标准 anchor 的世界坐标。
   * 对角 anchor（NE/NW/SE/SW）取参数曲线 t=π/4 处的点：
   * (rx·cos(π/4), ry·sin(π/4)) = (rx/√2, ry/√2)。
   * 这与 TikZ 椭圆对角 anchor 的"参数等分"约定一致。
   */
  anchor: (e: Ellipse, name: EllipseAnchor): Position => {
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
   * 从中心向 toward 方向画射线，求与椭圆的交点。
   * 椭圆方程：(x/rx)² + (y/ry)² = 1。
   * 沿方向 (lx, ly) 缩放 t 倍命中：t² × ((lx/rx)² + (ly/ry)²) = 1
   * → t = 1 / √((lx/rx)² + (ly/ry)²)。
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
