import type { AtDirection, IRAtPosition, IRBetweenPosition, IROffsetPosition, IRPosition, PolarPosition } from '../ir';
import type { Transform } from '../primitive';
import type { NameStack } from './name-stack';
import { inverseTransformChain } from './scope';

/**
 * between 端点 → 世界坐标解析器（依赖注入，避免 position.ts ↔ compile/path/anchor.ts 循环）
 * @description 实参由 compile 层注入（= `refPointOfTarget`，处理 NodeTarget anchor / Cartesian / Polar /
 *   Offset / 嵌套 between，返回世界坐标）。resolvePosition 收到 between 时调它取世界中点再反投影回局部。
 */
export type ResolveBetweenGlobal = (
  between: IRBetweenPosition,
  nameStack: NameStack,
  scopeChain: ReadonlyArray<Transform>,
) => IRPosition | null;

/** 默认相对定位距离（CompileOptions.nodeDistance 未配时使用） */
const DEFAULT_NODE_DISTANCE = 1;

/**
 * 8 方向 → 屏幕坐标系（y 向下）单位向量
 * @description above=视觉上方 (y 减小)；4 对角分量 1/√2 保证斜向与水平/垂直距离等长（对角点落在半径=distance 圆周上）
 */
const DIRECTION_VECTOR: Record<AtDirection, [number, number]> = {
  above: [0, -1],
  below: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  'above-left': [-Math.SQRT1_2, -Math.SQRT1_2],
  'above-right': [Math.SQRT1_2, -Math.SQRT1_2],
  'below-left': [-Math.SQRT1_2, Math.SQRT1_2],
  'below-right': [Math.SQRT1_2, Math.SQRT1_2],
};

/**
 * IR 各种位置形态（笛卡尔/极坐标/相对定位/偏移定位/节点 id）→ 笛卡尔位置
 * @description
 *   - **返回值语义**：当 `scopeChain` 非空时，返回**当前 scope 局部坐标系**下的笛卡尔位置；
 *     调用方负责走 `applyTransformChain(local, scopeChain)` 投回全局。当 `scopeChain` 为空时
 *     等价于 v0.1 行为（全局坐标）。
 *   - **referent 处理**：node id lookup 拿到的 layout.rect 已是全局坐标；本函数内部用
 *     `inverseTransformChain` 把全局 referent 反向投影到当前 scope 局部坐标系作为"在当前
 *     scope 局部的固定点"基准。relative 部分（polar 的 angle/radius、at 的 direction/distance、
 *     offset 的 dx/dy）在当前 scope 局部度量后加到 referent 局部坐标上。
 *   - **嵌套**：PolarPosition.origin / OffsetPosition.of 是嵌套 polar 时，递归调用传同样
 *     scopeChain——整条嵌套链都在当前 scope 局部度量。
 *   - **笛卡尔字面量**：`Position` 形态直接返回（v0.1 行为延续：scope 内笛卡尔字面量在
 *     当前 scope 局部度量；调用方走 applyTransformChain 投全局）。
 *   - 极坐标 origin / 偏移定位 of 均可递归引用节点 id 或字面坐标；relative `AtPosition` of
 *     必须引用已定义节点/coordinate；解析失败返回 null。
 *   - 节点 id lookup 走 NameStack.lookup 进行 inside-out 搜索（内层 frame 可见外层 frame）；
 *     nodeDistance 为容器 prop 注入默认距离，AtPosition 自带 distance 优先
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
    const refLocal =
      scopeChain.length === 0 ? refGlobal : inverseTransformChain(refGlobal, scopeChain);
    const distance = pos.distance ?? nodeDistance;
    const [dx, dy] = DIRECTION_VECTOR[pos.direction];
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
  const rad = (pos.angle * Math.PI) / 180;
  return [
    origin[0] + Math.cos(rad) * pos.radius,
    origin[1] + Math.sin(rad) * pos.radius,
  ];
};
