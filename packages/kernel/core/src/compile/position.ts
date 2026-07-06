import { arcEndPoint } from '@retikz/math';

import type { Transform } from '../contract';
import type { IRBetweenPosition, IRPosition, IRResolvablePosition } from '../schemas';
import type { NamespaceStack } from './namespace';

import {
  AnchorUnitVectorByAnchor,
  isAtPositionLike,
  isBetweenPositionLike,
  isNodeTargetLike,
  isOffsetPositionLike,
  isPolarPositionLike,
  isPositionTuple,
} from '../shared';
import { DEFAULT_NODE_DISTANCE } from './constants';
import { inverseTransformChain } from './transform';

/** between 端点的世界坐标解析器，由 path 编译侧注入。 */
export type ResolveBetweenGlobal = (
  between: IRBetweenPosition,
  namespaceStack: NamespaceStack,
  scopeChain: ReadonlyArray<Transform>,
) => IRPosition | null;

/** position 解析所需的编译上下文。 */
export type ResolvePositionContext = {
  /** id 查询栈。 */
  namespaceStack: NamespaceStack;
  /** 相对定位默认距离。 */
  nodeDistance?: number;
  /** 当前 scope 累积 transform。 */
  scopeChain?: ReadonlyArray<Transform>;
  /** between 端点的全局坐标解析器。 */
  resolveBetweenGlobal?: ResolveBetweenGlobal;
};

/** 从 position referent 中提取诊断用节点 id；只读输入，不解析 namespace。 */
export const nodeIdFromPositionReferent = (ref: unknown): string | undefined =>
  typeof ref === 'string' ? ref : nodeIdFromResolvableTarget(ref);

/** 从可解析 target / position 形态中提取一个代表性节点 id，供 unresolved warning 使用。 */
export const nodeIdFromResolvableTarget = (target: unknown): string | undefined => {
  if (isNodeTargetLike(target)) return target.id;
  if (isBetweenPositionLike(target)) {
    return nodeIdFromResolvableTarget(target.between[0]) ?? nodeIdFromResolvableTarget(target.between[1]);
  }
  if (isOffsetPositionLike(target) || isAtPositionLike(target)) return nodeIdFromPositionReferent(target.of);
  if (isPolarPositionLike(target)) {
    return nodeIdFromPositionReferent(target.origin);
  }
  return undefined;
};

/**
 * 把 IR 位置解析为笛卡尔坐标。
 * @description `scopeChain` 非空时返回当前 scope 局部坐标；解析失败返回 null。
 */
export const resolvePosition = (pos: IRResolvablePosition, context: ResolvePositionContext): IRPosition | null => {
  const { namespaceStack, nodeDistance = DEFAULT_NODE_DISTANCE, scopeChain = [], resolveBetweenGlobal } = context;
  if (typeof pos === 'string') {
    const node = namespaceStack.lookup(pos);
    if (!node) return null;
    // 全局坐标 referent → 当前 scope 局部坐标（无 chain 时恒等）
    const global: IRPosition = [node.rect.x, node.rect.y];
    return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
  }
  if (isPositionTuple(pos)) return [pos[0], pos[1]];
  if (isAtPositionLike(pos)) {
    const ref = namespaceStack.lookup(pos.of);
    if (!ref) return null;
    const refGlobal: IRPosition = [ref.rect.x, ref.rect.y];
    const refLocal = scopeChain.length === 0 ? refGlobal : inverseTransformChain(refGlobal, scopeChain);
    const distance = pos.distance ?? nodeDistance;
    const [dx, dy] = AnchorUnitVectorByAnchor[pos.direction];
    return [refLocal[0] + dx * distance, refLocal[1] + dy * distance];
  }
  if (isOffsetPositionLike(pos)) {
    const base = resolvePosition(pos.of, context);
    if (!base) return null;
    return [base[0] + pos.offset[0], base[1] + pos.offset[1]];
  }
  if (isBetweenPositionLike(pos)) {
    if (!resolveBetweenGlobal) return null;
    const global = resolveBetweenGlobal(pos, namespaceStack, scopeChain);
    if (!global) return null;
    return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
  }
  // PolarPosition：先解析 origin（递归走 scopeChain → 局部坐标），再叠加极偏移（局部度量）
  let origin: IRPosition;
  if (!pos.origin) {
    origin = [0, 0];
  } else {
    const resolved = resolvePosition(pos.origin, context);
    if (!resolved) return null;
    origin = resolved;
  }
  return arcEndPoint(origin, pos.radius, pos.angle);
};
