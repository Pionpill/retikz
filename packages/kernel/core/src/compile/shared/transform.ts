import type { AffineMatrix } from '@retikz/math';
import { AFFINE_IDENTITY, DEG_TO_RAD, applyAffine, multiplyAffine } from '@retikz/math';

import type { Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRPosition } from '../../schemas';

/** 将局部点按 transform chain 投影到全局坐标 */
export const applyTransformChain = (local: IRPosition, chain: ReadonlyArray<Transform>): IRPosition => {
  let x = local[0];
  let y = local[1];

  for (let i = chain.length - 1; i >= 0; i--) {
    const t = chain[i];
    if (t.kind === 'translate') {
      x += t.x;
      y += t.y;
    } else if (t.kind === 'rotate') {
      const cx = t.cx ?? 0;
      const cy = t.cy ?? 0;
      const rad = t.degrees * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * cos - dy * sin;
      y = cy + dx * sin + dy * cos;
    } else {
      const sy = t.y ?? t.x;
      x *= t.x;
      y *= sy;
    }
  }

  return [x, y];
};

/** 将全局点反投影回当前 transform chain 的局部坐标 */
export const inverseTransformChain = (global: IRPosition, chain: ReadonlyArray<Transform>): IRPosition => {
  let x = global[0];
  let y = global[1];

  for (const t of chain) {
    if (t.kind === 'translate') {
      x -= t.x;
      y -= t.y;
    } else if (t.kind === 'rotate') {
      const cx = t.cx ?? 0;
      const cy = t.cy ?? 0;
      const rad = -t.degrees * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * cos - dy * sin;
      y = cy + dx * sin + dy * cos;
    } else {
      const sy = t.y ?? t.x;
      if (t.x === 0 || sy === 0) {
        throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'non-invertible scope transform');
      }

      x /= t.x;
      y /= sy;
    }
  }

  return [x, y];
};

/** 当前 Scope 的合成消费态；仅 compile 内部使用，不进入 IR 或 Scene */
export type ComposedScopeTransform = Readonly<{
  /** 按祖先到当前层排列的只读声明，用于输出及极端数值的逐项计算 */
  chain: ReadonlyArray<Transform>;
  /** 正向仿射矩阵 */
  forward: AffineMatrix;
  /** 逆向仿射矩阵；零缩放轴时为空，直到实际反投影才报错 */
  inverse: AffineMatrix | null;
  /** 矩阵系数是否可直接消费 */
  finiteForward: boolean;
  /** 逆矩阵系数是否可直接消费 */
  finiteInverse: boolean;
  /** 保持 CompiledNodeLayout 投影规则的累计旋转弧度 */
  rotation: number;
  /** 保持 CompiledNodeLayout 投影规则的逐轴缩放乘积 */
  scaleX: number;
  scaleY: number;
}>;

/** 无变换 Scope 共享的只读消费态 */
const IDENTITY_SCOPE_TRANSFORM: ComposedScopeTransform = Object.freeze({
  chain: Object.freeze([]),
  forward: AFFINE_IDENTITY,
  inverse: AFFINE_IDENTITY,
  finiteForward: true,
  finiteInverse: true,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

/** 由 Scene transform 声明构造正向或逆向矩阵，不使用行列式阈值 */
const transformToMatrix = (transform: Transform, inverse = false): AffineMatrix => {
  if (transform.kind === 'translate')
    return [1, 0, 0, 1, inverse ? -transform.x : transform.x, inverse ? -transform.y : transform.y];
  if (transform.kind === 'scale')
    return [
      inverse ? 1 / transform.x : transform.x,
      0,
      0,
      inverse ? 1 / (transform.y ?? transform.x) : (transform.y ?? transform.x),
      0,
      0,
    ];
  const radians = transform.degrees * DEG_TO_RAD * (inverse ? -1 : 1);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const cx = transform.cx ?? 0;
  const cy = transform.cy ?? 0;
  return [cos, sin, -sin, cos, cx - cx * cos + cy * sin, cy - cx * sin - cy * cos];
};

/** 从父级消费态组合本层变换；调用方提供的完整链只用于输出，不参与重复遍历 */
export const composeScopeTransform = (
  transforms: ReadonlyArray<Transform>,
  parent: ComposedScopeTransform = IDENTITY_SCOPE_TRANSFORM,
  chain: ReadonlyArray<Transform> = parent.chain.length === 0 ? transforms : [...parent.chain, ...transforms],
): ComposedScopeTransform => {
  if (transforms.length === 0) return parent;
  let forward = parent.forward;
  let inverse = parent.inverse;
  let rotation = parent.rotation;
  let scaleX = parent.scaleX;
  let scaleY = parent.scaleY;
  for (const transform of transforms) {
    forward = multiplyAffine(forward, transformToMatrix(transform));
    if (transform.kind === 'scale') {
      scaleX *= transform.x;
      scaleY *= transform.y ?? transform.x;
      if (transform.x === 0 || (transform.y ?? transform.x) === 0) inverse = null;
    } else if (transform.kind === 'rotate') rotation += transform.degrees * DEG_TO_RAD;
    if (inverse !== null) inverse = multiplyAffine(transformToMatrix(transform, true), inverse);
  }
  if (__DEV__) {
    // 仅在本层首次产生不可逆变换时提示，避免后代继承同一状态而重复报警
    if (inverse === null && parent.inverse !== null) {
      console.warn('Scope transform contains a zero scale axis; inverse coordinate projection is unavailable.');
    }
  }
  const finiteForward = forward.every(Number.isFinite);
  const finiteInverse = inverse !== null && inverse.every(Number.isFinite);
  return {
    chain,
    forward,
    inverse,
    // 正逆系数任一溢出时，另一方向也可能已经丢失非零尺度，保留逐项计算
    finiteForward: finiteForward && (inverse === null || finiteInverse),
    finiteInverse: finiteForward && finiteInverse,
    rotation,
    scaleX,
    scaleY,
  };
};

/** 用已合成消费态投影点；系数溢出时保留逐项算术的数值范围 */
export const applyScopeTransform = (point: IRPosition, transform: ComposedScopeTransform): IRPosition => {
  if (transform.chain.length === 0) return [point[0], point[1]];
  return transform.finiteForward ? applyAffine(transform.forward, point) : applyTransformChain(point, transform.chain);
};

/** 用已合成消费态反投影，保留零轴错误与极小非零轴的既有语义 */
export const inverseScopeTransform = (point: IRPosition, transform: ComposedScopeTransform): IRPosition => {
  if (transform.chain.length === 0) return [point[0], point[1]];
  if (transform.inverse === null)
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'non-invertible scope transform');
  return transform.finiteInverse
    ? applyAffine(transform.inverse, point)
    : inverseTransformChain(point, transform.chain);
};
