import type { Position } from './point';

/** 任何"中心 + 可选旋转"形状的几何契约（rect / circle / ellipse / diamond 共用） */
export type CenteredShape = {
  /** 中心横坐标 */
  x: number;
  /** 中心纵坐标 */
  y: number;
  /** 绕中心旋转弧度（可选，0 / 缺省 = 不旋转） */
  rotate?: number;
};

/**
 * 本地坐标（以中心为原点）→ 世界坐标
 * @description rotate=0 / 缺省时退化为平移；非零时按右手系绕中心旋转后再平移
 */
export const localToWorld = (s: CenteredShape, local: Position): Position => {
  const angle = s.rotate ?? 0;
  if (angle === 0) return [s.x + local[0], s.y + local[1]];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    s.x + local[0] * cos - local[1] * sin,
    s.y + local[0] * sin + local[1] * cos,
  ];
};

/**
 * 世界坐标 → 本地坐标（`localToWorld` 逆变换）
 * @description 先反平移到中心、再反旋转回本地基；旋转矩阵转置即逆
 */
export const worldToLocal = (s: CenteredShape, world: Position): Position => {
  const tx = world[0] - s.x;
  const ty = world[1] - s.y;
  const angle = s.rotate ?? 0;
  if (angle === 0) return [tx, ty];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [tx * cos + ty * sin, -tx * sin + ty * cos];
};
