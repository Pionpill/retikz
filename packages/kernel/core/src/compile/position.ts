import { arcEndPoint } from '@retikz/math';

import type { Transform } from '../contract';
import type { IRAtPosition, IRBetweenPosition, IROffsetPosition, IRPosition, PolarPosition } from '../schemas';
import type { NameStack } from './name-stack';

import { DirectionVectorByAtDirection } from './direction';
import { inverseTransformChain } from './scope';

/** between 端点的世界坐标解析器，由 path 编译侧注入。 */
export type ResolveBetweenGlobal = (
  between: IRBetweenPosition,
  nameStack: NameStack,
  scopeChain: ReadonlyArray<Transform>,
) => IRPosition | null;

/** 相对定位距离常量。 */
const DEFAULT_NODE_DISTANCE = 1;

/**
 * 把 IR 位置解析为笛卡尔坐标。
 * @description `scopeChain` 非空时返回当前 scope 局部坐标；解析失败返回 null。
 */
export const resolvePosition = (
  pos: IRPosition | PolarPosition | IRAtPosition | IROffsetPosition | IRBetweenPosition | string,
  nameStack: NameStack,
  nodeDistance: number = DEFAULT_NODE_DISTANCE,
  scopeChain: ReadonlyArray<Transform> = [],
  resolveBetweenGlobal?: ResolveBetweenGlobal,
): IRPosition | null => {
  if (typeof pos === 'string') {
    const node = nameStack.lookup(pos);
    if (!node) return null;
    // 全局坐标 referent → 当前 scope 局部坐标（无 chain 时恒等）
    const global: IRPosition = [node.rect.x, node.rect.y];
    return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
  }
  if (Array.isArray(pos)) return pos;
  if ('direction' in pos) {
    // AtPosition：referent 全局 → 反向投影到当前 scope 局部，再加 direction × distance（局部度量）
    const ref = nameStack.lookup(pos.of);
    if (!ref) return null;
    const refGlobal: IRPosition = [ref.rect.x, ref.rect.y];
    const refLocal = scopeChain.length === 0 ? refGlobal : inverseTransformChain(refGlobal, scopeChain);
    const distance = pos.distance ?? nodeDistance;
    const [dx, dy] = DirectionVectorByAtDirection[pos.direction];
    return [refLocal[0] + dx * distance, refLocal[1] + dy * distance];
  }
  if ('offset' in pos) {
    // OffsetPosition：递归 resolve `of`（string id / Position / PolarPosition）后已是局部坐标，
    // 再叠加 (dx, dy)（局部度量）
    const base = resolvePosition(pos.of, nameStack, nodeDistance, scopeChain);
    if (!base) return null;
    return [base[0] + pos.offset[0], base[1] + pos.offset[1]];
  }
  if ('between' in pos) {
    // BetweenPosition：注入的 resolver 取两端点 lerp 后的**世界**中点，再反投影回当前 scope 局部坐标
    // （与本函数"返回局部坐标、调用方走 applyTransformChain 投全局"的契约一致）。
    if (!resolveBetweenGlobal) return null;
    const global = resolveBetweenGlobal(pos, nameStack, scopeChain);
    if (!global) return null;
    return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
  }
  // PolarPosition：先解析 origin（递归走 scopeChain → 局部坐标），再叠加极偏移（局部度量）
  let origin: IRPosition;
  if (!pos.origin) {
    origin = [0, 0];
  } else {
    const resolved = resolvePosition(pos.origin, nameStack, nodeDistance, scopeChain);
    if (!resolved) return null;
    origin = resolved;
  }
  return arcEndPoint(origin, pos.radius, pos.angle);
};
