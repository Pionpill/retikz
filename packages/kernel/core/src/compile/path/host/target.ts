import type { Transform } from '../../../contract';
import type {
  FoldStepViaValue,
  IRBetweenPosition,
  IRBoundary,
  IRNodeTarget,
  IRPosition,
  IRRelativeAccumulateTarget,
  IRRelativeTarget,
  IRTarget,
} from '../../../schemas';
import type { NamespaceStack } from '../../namespace';
import type { NodeLayout } from '../../node';

import { FoldStepVia } from '../../../schemas';
import {
  isBetweenPositionLike,
  isNodeTargetLike,
  isRelativeAccumulateTargetLike,
  isRelativeTargetLike,
} from '../../../shared';
import { lerpPoint, point } from '../../../shared/geometry';
import { boundaryPointOf } from '../../node';
import { resolvePosition } from '../../position';
import { resolveAnchor, resolveEdgePoint } from '../../reference';
import { applyTransformChain, inverseTransformChain } from '../../transform';

/** 判断 target 是否为按 id 引用节点或坐标的对象目标 */
const isNodeTarget = (t: IRTarget): t is IRNodeTarget => isNodeTargetLike(t);

/** 判断 target 是否需要由节点边界自动裁剪决定端点 */
export const isAutoBoundaryTarget = (target: IRTarget): boolean =>
  isNodeTarget(target) && target.anchor === undefined && target.offset === undefined;

/** 判断 target 是否为两端目标之间的比例点 */
const isBetween = (t: IRTarget): t is IRBetweenPosition => isBetweenPositionLike(t);

/** 判断 target 是否为进入 emit 前应被 path 游标归一化的相对端点 */
const isRelative = (t: IRTarget): t is IRRelativeTarget | IRRelativeAccumulateTarget =>
  isRelativeTargetLike(t) || isRelativeAccumulateTargetLike(t);

/** 将显式 anchor 解析为世界坐标 */
const resolveAnchorRef = (
  node: NodeLayout,
  anchor: NonNullable<IRNodeTarget['anchor']>,
  boundary: IRBoundary | undefined,
): IRPosition => {
  if (typeof anchor === 'number') return resolveAnchor(node, String(anchor), boundary);
  if (typeof anchor === 'string') return resolveAnchor(node, anchor, boundary);
  return resolveEdgePoint(node, anchor.side, anchor.fraction);
};

/** 在世界坐标系叠加节点目标的 offset */
const addOffset = (base: IRPosition, offset: IRNodeTarget['offset']): IRPosition =>
  offset ? [base[0] + offset[0], base[1] + offset[1]] : base;

/**
 * 解析 target 的参考点
 * @description 参考点用于确定前后段方向、折角位置和非裁剪目标坐标。未指定 anchor 的 NodeTarget 取节点中心，不按连接面裁剪
 */
export const refPointOfTarget = (
  target: IRTarget,
  namespaceStack: NamespaceStack,
  scopeChain: ReadonlyArray<Transform> = [],
): IRPosition | null => {
  // NodeTarget 的参考点是节点中心或显式 anchor，不随 toward 变化。
  if (isNodeTarget(target)) {
    const node = namespaceStack.lookup(target.id);
    if (!node) return null;
    const base =
      target.anchor === undefined
        ? ([node.rect.x, node.rect.y] as IRPosition)
        : resolveAnchorRef(node, target.anchor, target.boundary ?? node.boundary);
    return addOffset(base, target.offset);
  }
  // between 端点允许递归，先解析到世界坐标再插值。
  if (isBetween(target)) {
    const a = refPointOfTarget(target.between[0], namespaceStack, scopeChain);
    const b = refPointOfTarget(target.between[1], namespaceStack, scopeChain);
    if (!a || !b) return null;
    const mid = lerpPoint(a, b, target.fraction);
    // 非 finite 参考点不能进入 Scene，返回 null 交由调用侧按未解析处理。
    if (!Number.isFinite(mid[0]) || !Number.isFinite(mid[1])) return null;
    return mid;
  }
  // relative 目标应已在进入 path emit 前预解析。
  if (isRelative(target)) {
    return null;
  }
  const local = resolvePosition(target, { namespaceStack, scopeChain });
  if (!local) return null;
  return scopeChain.length === 0 ? local : applyTransformChain(local, scopeChain);
};

/**
 * 把 target 解析到当前 scope 的局部坐标系
 * @description 节点 layout 保持全局坐标，解析后按累计 transform 反投影；字面量与相对位置沿用 scope 局部度量
 */
export const localPointOfTarget = (
  target: IRTarget,
  namespaceStack: NamespaceStack,
  scopeChain: ReadonlyArray<Transform> = [],
): IRPosition | null => {
  if (isNodeTarget(target)) {
    const node = namespaceStack.lookup(target.id);
    if (!node) return null;
    const base =
      target.anchor === undefined
        ? ([node.rect.x, node.rect.y] as IRPosition)
        : resolveAnchorRef(node, target.anchor, target.boundary ?? node.boundary);
    const global = addOffset(base, target.offset);
    return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
  }
  if (isBetween(target)) {
    const a = localPointOfTarget(target.between[0], namespaceStack, scopeChain);
    const b = localPointOfTarget(target.between[1], namespaceStack, scopeChain);
    if (!a || !b) return null;
    const mid = lerpPoint(a, b, target.fraction);
    if (!Number.isFinite(mid[0]) || !Number.isFinite(mid[1])) return null;
    return mid;
  }
  if (isRelative(target)) {
    return null;
  }
  return resolvePosition(target, { namespaceStack, scopeChain });
};

/** 根据 fold step 的方向计算正交折角中间点 */
export const cornerOf = (prev: IRPosition, curr: IRPosition, via: FoldStepViaValue): IRPosition =>
  via === FoldStepVia.HorizontalThenVertical ? [curr[0], prev[1]] : [prev[0], curr[1]];

/** target 裁剪解析所需上下文 */
export type ClipForTargetContext = {
  /** 节点 id 查询栈 */
  namespaceStack: NamespaceStack;
  /** 当前 scope 的累计 transform */
  scopeChain?: ReadonlyArray<Transform>;
};

/**
 * 解析 target 在 toward 方向上的实际绘制端点
 * @description 未指定 anchor 的 NodeTarget 会按连接面裁剪到节点边界；显式 anchor、between 和普通坐标目标
 * 解析为固定点
 */
export const clipForTarget = (
  target: IRTarget,
  toward: IRPosition,
  context: ClipForTargetContext,
): IRPosition | null => {
  const { namespaceStack, scopeChain = [] } = context;
  // NodeTarget 的裁剪端点可能随 toward 落在不同连接面位置。
  if (isNodeTarget(target)) {
    const node = namespaceStack.lookup(target.id);
    if (!node) return null;
    const boundary = target.boundary ?? node.boundary;
    const towardGlobal = scopeChain.length === 0 ? toward : applyTransformChain(toward, scopeChain);
    const base =
      target.anchor === undefined
        ? boundaryPointOf(node, towardGlobal, boundary)
        : resolveAnchorRef(node, target.anchor, boundary);
    const global = addOffset(base, target.offset);
    return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
  }
  // between 是固定点，不参与连接面裁剪。
  if (isBetween(target)) {
    return localPointOfTarget(target, namespaceStack, scopeChain);
  }
  // relative 目标应已在进入 path emit 前预解析。
  if (isRelative(target)) {
    return null;
  }
  const local = resolvePosition(target, { namespaceStack, scopeChain });
  if (!local) return null;
  return local;
};

/** 判断两个已解析坐标是否逐分量精确相等 */
export const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean => !!a && !!b && point.equal(a, b);
