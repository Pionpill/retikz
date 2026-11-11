import type { AffineMatrix } from '@retikz/math';
import { AFFINE_IDENTITY, DEG_TO_RAD, applyAffine } from '@retikz/math';

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
  canApplyForwardMatrix: boolean;
  /** 逆矩阵系数是否可直接消费 */
  canApplyInverseMatrix: boolean;
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
  canApplyForwardMatrix: true,
  canApplyInverseMatrix: true,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

/** 从父级消费态组合本层变换；调用方提供的完整链只用于输出，不参与重复遍历 */
export const composeScopeTransform = (
  transforms: ReadonlyArray<Transform>,
  parent: ComposedScopeTransform = IDENTITY_SCOPE_TRANSFORM,
  chain: ReadonlyArray<Transform> = parent.chain.length === 0 ? transforms : [...parent.chain, ...transforms],
): ComposedScopeTransform => {
  if (transforms.length === 0) return parent;

  /** ⚡按变换类型直接累计正逆矩阵标量，减少局部矩阵和乘法结果分配；父级矩阵保持不变 */
  let [forwardA, forwardB, forwardC, forwardD, forwardE, forwardF] = parent.forward;
  let [inverseA, inverseB, inverseC, inverseD, inverseE, inverseF] = parent.inverse ?? AFFINE_IDENTITY;
  let hasInverse = parent.inverse !== null;
  let rotation = parent.rotation;
  let scaleX = parent.scaleX;
  let scaleY = parent.scaleY;

  for (const transform of transforms) {
    // a-f 是本次复合前的仿射系数；正向右乘，逆向左乘
    const a = forwardA;
    const b = forwardB;
    const c = forwardC;
    const d = forwardD;
    const e = forwardE;
    const f = forwardF;
    const inversePreviousA = inverseA;
    const inversePreviousB = inverseB;
    const inversePreviousC = inverseC;
    const inversePreviousD = inverseD;
    const inversePreviousE = inverseE;
    const inversePreviousF = inverseF;

    if (transform.kind === 'translate') {
      const { x, y } = transform;
      // 零结果保留符号；非有限系数保留零乘积的 NaN 传播，不重新遍历整链
      forwardA = a === 0 || !Number.isFinite(c) ? a + c * 0 : a;
      forwardB = b === 0 || !Number.isFinite(d) ? b + d * 0 : b;
      forwardC = c === 0 || !Number.isFinite(a) ? a * 0 + c : c;
      forwardD = d === 0 || !Number.isFinite(b) ? b * 0 + d : d;
      forwardE = a * x + c * y + e;
      forwardF = b * x + d * y + f;
      if (hasInverse) {
        inverseA =
          inversePreviousA === 0 || !Number.isFinite(inversePreviousB)
            ? inversePreviousA + 0 * inversePreviousB
            : inversePreviousA;
        inverseB =
          inversePreviousB === 0 || !Number.isFinite(inversePreviousA)
            ? 0 * inversePreviousA + inversePreviousB
            : inversePreviousB;
        inverseC =
          inversePreviousC === 0 || !Number.isFinite(inversePreviousD)
            ? inversePreviousC + 0 * inversePreviousD
            : inversePreviousC;
        inverseD =
          inversePreviousD === 0 || !Number.isFinite(inversePreviousC)
            ? 0 * inversePreviousC + inversePreviousD
            : inversePreviousD;
        inverseE = inversePreviousE - x;
        inverseF = inversePreviousF - y;
        if (inverseE === 0 || !Number.isFinite(inversePreviousF))
          inverseE = inversePreviousE + 0 * inversePreviousF + -x;
        if (inverseF === 0 || !Number.isFinite(inversePreviousE))
          inverseF = 0 * inversePreviousE + inversePreviousF + -y;
      }
    } else if (transform.kind === 'scale') {
      const x = transform.x;
      const y = transform.y ?? x;
      scaleX *= x;
      scaleY *= y;
      forwardA = a * x;
      forwardB = b * x;
      forwardC = c * y;
      forwardD = d * y;
      if (forwardA === 0 || !Number.isFinite(c)) forwardA = a * x + c * 0;
      if (forwardB === 0 || !Number.isFinite(d)) forwardB = b * x + d * 0;
      if (forwardC === 0 || !Number.isFinite(a)) forwardC = a * 0 + c * y;
      if (forwardD === 0 || !Number.isFinite(b)) forwardD = b * 0 + d * y;
      forwardE = e === 0 || !Number.isFinite(a) || !Number.isFinite(c) ? a * 0 + c * 0 + e : e;
      forwardF = f === 0 || !Number.isFinite(b) || !Number.isFinite(d) ? b * 0 + d * 0 + f : f;
      if (x === 0 || y === 0) hasInverse = false;
      if (hasInverse) {
        const inverseX = 1 / x;
        const inverseY = 1 / y;
        inverseA = inverseX * inversePreviousA;
        inverseB = inverseY * inversePreviousB;
        inverseC = inverseX * inversePreviousC;
        inverseD = inverseY * inversePreviousD;
        inverseE = inverseX * inversePreviousE;
        inverseF = inverseY * inversePreviousF;
        if (inverseA === 0 || !Number.isFinite(inversePreviousB))
          inverseA = inverseX * inversePreviousA + 0 * inversePreviousB;
        if (inverseB === 0 || !Number.isFinite(inversePreviousA))
          inverseB = 0 * inversePreviousA + inverseY * inversePreviousB;
        if (inverseC === 0 || !Number.isFinite(inversePreviousD))
          inverseC = inverseX * inversePreviousC + 0 * inversePreviousD;
        if (inverseD === 0 || !Number.isFinite(inversePreviousC))
          inverseD = 0 * inversePreviousC + inverseY * inversePreviousD;
        if (inverseE === 0 || !Number.isFinite(inversePreviousF))
          inverseE = inverseX * inversePreviousE + 0 * inversePreviousF + 0;
        if (inverseF === 0 || !Number.isFinite(inversePreviousE))
          inverseF = 0 * inversePreviousE + inverseY * inversePreviousF + 0;
      }
    } else {
      const radians = transform.degrees * DEG_TO_RAD;
      /** ⚡正逆旋转复用同次 sin/cos，逆向正弦直接取反，减少三角函数计算 */
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const inverseSin = -sin;
      const cx = transform.cx ?? 0;
      const cy = transform.cy ?? 0;
      const translationX = cx - cx * cos + cy * sin;
      const translationY = cy - cx * sin - cy * cos;
      rotation += radians;
      forwardA = a * cos + c * sin;
      forwardB = b * cos + d * sin;
      forwardC = a * inverseSin + c * cos;
      forwardD = b * inverseSin + d * cos;
      forwardE = a * translationX + c * translationY + e;
      forwardF = b * translationX + d * translationY + f;
      if (hasInverse) {
        const inverseTranslationX = cx - cx * cos + cy * inverseSin;
        const inverseTranslationY = cy - cx * inverseSin - cy * cos;
        inverseA = cos * inversePreviousA + sin * inversePreviousB;
        inverseB = inverseSin * inversePreviousA + cos * inversePreviousB;
        inverseC = cos * inversePreviousC + sin * inversePreviousD;
        inverseD = inverseSin * inversePreviousC + cos * inversePreviousD;
        inverseE = cos * inversePreviousE + sin * inversePreviousF + inverseTranslationX;
        inverseF = inverseSin * inversePreviousE + cos * inversePreviousF + inverseTranslationY;
      }
    }
  }

  const forward: AffineMatrix = [forwardA, forwardB, forwardC, forwardD, forwardE, forwardF];
  const inverse: AffineMatrix | null = hasInverse ? [inverseA, inverseB, inverseC, inverseD, inverseE, inverseF] : null;
  const isForwardFinite = forward.every(Number.isFinite);
  const isInverseFinite = inverse !== null && inverse.every(Number.isFinite);

  if (__DEV__) {
    // 仅在本层首次产生不可逆变换时提示，避免后代继承同一状态而重复报警
    if (inverse === null && parent.inverse !== null) {
      console.warn('Scope transform contains a zero scale axis; inverse coordinate projection is unavailable.');
    }
  }

  return {
    chain,
    forward,
    inverse,
    // 正逆系数任一溢出时，另一方向也可能已经丢失非零尺度，保留逐项计算
    canApplyForwardMatrix: isForwardFinite && (inverse === null || isInverseFinite),
    canApplyInverseMatrix: isForwardFinite && isInverseFinite,
    rotation,
    scaleX,
    scaleY,
  };
};

/** 用已合成消费态投影点；系数溢出时保留逐项算术的数值范围 */
export const applyScopeTransform = (point: IRPosition, transform: ComposedScopeTransform): IRPosition => {
  if (transform.chain.length === 0) return [point[0], point[1]];
  return transform.canApplyForwardMatrix
    ? applyAffine(transform.forward, point)
    : applyTransformChain(point, transform.chain);
};

/** 用已合成消费态反投影，保留零轴错误与极小非零轴的既有语义 */
export const inverseScopeTransform = (point: IRPosition, transform: ComposedScopeTransform): IRPosition => {
  if (transform.chain.length === 0) return [point[0], point[1]];
  if (transform.inverse === null)
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'non-invertible scope transform');
  return transform.canApplyInverseMatrix
    ? applyAffine(transform.inverse, point)
    : inverseTransformChain(point, transform.chain);
};
