import type { AffineMatrix } from '@retikz/math';
import { AFFINE_IDENTITY, DEG_TO_RAD, applyAffine, multiplyAffine } from '@retikz/math';

import type { Transform } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import type { IRPosition } from '../schemas';
import type { CompiledNodeLayout } from './node';

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
const computeTransformToMatrix = (transform: Transform, inverse = false): AffineMatrix => {
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
    forward = multiplyAffine(forward, computeTransformToMatrix(transform));
    if (transform.kind === 'scale') {
      scaleX *= transform.x;
      scaleY *= transform.y ?? transform.x;
      if (transform.x === 0 || (transform.y ?? transform.x) === 0) inverse = null;
    } else if (transform.kind === 'rotate') rotation += transform.degrees * DEG_TO_RAD;
    if (inverse !== null) inverse = multiplyAffine(computeTransformToMatrix(transform, true), inverse);
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

/** 保持既有布局投影口径，只复用合成的点变换与旋转/缩放累计量 */
export const projectLayoutWithTransform = (
  layout: CompiledNodeLayout,
  transform: ComposedScopeTransform,
): CompiledNodeLayout => {
  const [x, y] = applyScopeTransform([layout.geometry.rect.x, layout.geometry.rect.y], transform);
  const scaleX = Math.abs(transform.scaleX);
  const scaleY = Math.abs(transform.scaleY);
  return {
    ...layout,
    geometry: {
      ...layout.geometry,
      rect: {
        ...layout.geometry.rect,
        x,
        y,
        rotate: (layout.geometry.rect.rotate ?? 0) + transform.rotation,
        width: layout.geometry.rect.width * scaleX,
        height: layout.geometry.rect.height * scaleY,
      },
      margin: {
        top: layout.geometry.margin.top * scaleY,
        right: layout.geometry.margin.right * scaleX,
        bottom: layout.geometry.margin.bottom * scaleY,
        left: layout.geometry.margin.left * scaleX,
      },
    },
  };
};

/**
 * 单次编译遍历共享的 Scope 变换组合器
 * @description 当前变换链由调用方传入，本对象不维护当前 Scope；组合操作不原位修改输入链或已有合成结果
 * @remarks 缓存按数组对象身份命中，内容相同但引用不同的链不共享缓存；输入链及其变换项在缓存期间应保持不变
 */
export class ScopeTransformComposer {
  /** 按变换链数组身份缓存合成矩阵及累计旋转、缩放信息 */
  private readonly transformCache = new WeakMap<ReadonlyArray<Transform>, ComposedScopeTransform>();
  /** 按原链、插入序列的数组身份及插入位置缓存组合后的链，复用数组身份以命中合成结果缓存 */
  private readonly insertions = new WeakMap<
    ReadonlyArray<Transform>,
    WeakMap<ReadonlyArray<Transform>, Map<number, ReadonlyArray<Transform>>>
  >();

  /** 获取变换链的合成结果；空链复用单位变换，非空链仅在首次访问时计算 */
  readonly resolve = (chain: ReadonlyArray<Transform>): ComposedScopeTransform => {
    if (chain.length === 0) return IDENTITY_SCOPE_TRANSFORM;
    let value = this.transformCache.get(chain);
    if (value === undefined) {
      value = composeScopeTransform(chain);
      this.transformCache.set(chain, value);
    }
    return value;
  };

  /**
   * 将一组变换插入原链指定位置，并缓存组合链与合成结果
   * @param chain 按祖先到当前层排列的原变换链
   * @param index 插入位置，等于原链长度时表示追加
   * @param transforms 保持自身顺序插入的变换序列
   * @returns 非空组合返回新链或已有缓存；任一输入为空时直接复用另一输入
   */
  readonly insert = (
    chain: ReadonlyArray<Transform>,
    index: number,
    transforms: ReadonlyArray<Transform>,
  ): ReadonlyArray<Transform> => {
    if (transforms.length === 0) return chain;
    if (chain.length === 0) return transforms;
    // 逐层定位原链、插入序列和位置，避免重复构造同一组合的数组
    let byTransforms = this.insertions.get(chain);
    if (byTransforms === undefined) {
      byTransforms = new WeakMap();
      this.insertions.set(chain, byTransforms);
    }
    let byIndex = byTransforms.get(transforms);
    if (byIndex === undefined) {
      byIndex = new Map();
      byTransforms.set(transforms, byIndex);
    }
    const previous = byIndex.get(index);
    if (previous !== undefined) return previous;
    const next =
      index === chain.length
        ? [...chain, ...transforms]
        : [...chain.slice(0, index), ...transforms, ...chain.slice(index)];
    // 尾部追加可复用原链合成结果；中间插入改变组合顺序，需要重新合成完整链
    const value =
      index === chain.length
        ? composeScopeTransform(transforms, this.resolve(chain), next)
        : composeScopeTransform(next);
    this.transformCache.set(next, value);
    byIndex.set(index, next);
    return next;
  };

  /** 在祖先链末尾追加当前层变换，复用插入缓存 */
  readonly append = (chain: ReadonlyArray<Transform>, transforms: ReadonlyArray<Transform>) =>
    this.insert(chain, chain.length, transforms);

  /** 将局部点按给定链投影到全局坐标，复用合成结果 */
  readonly apply = (point: IRPosition, chain: ReadonlyArray<Transform>) =>
    applyScopeTransform(point, this.resolve(chain));

  /** 将全局点反投影到给定链的局部坐标；链包含零缩放轴时抛出不可逆错误 */
  readonly inverse = (point: IRPosition, chain: ReadonlyArray<Transform>) =>
    inverseScopeTransform(point, this.resolve(chain));

  /** 按既有布局口径投影位置、累计旋转、尺寸与 margin，不重新计算几何包络 */
  readonly project = (layout: CompiledNodeLayout, chain: ReadonlyArray<Transform>) =>
    projectLayoutWithTransform(layout, this.resolve(chain));
}
