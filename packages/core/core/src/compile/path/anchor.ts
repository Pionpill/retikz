import type { IRBetweenPosition, IRNodeTarget, IRPosition, IRTarget } from '../../ir';
import type { IRConnectSurface } from '../../ir';
import type { Transform } from '../../primitive';
import { lerpPoint } from '../../geometry/_edge';
import { resolveAnchor, resolveEdgePoint } from '../anchor-cache';
import type { NameStack } from '../name-stack';
import { boundaryPointOf } from '../node';
import type { NodeLayout } from '../node';
import { resolvePosition } from '../position';
import { applyTransformChain } from '../scope';

/** target 是否对象形态 NodeTarget（`{ id, anchor?, offset? }`）；与 Position(array) / Polar / Offset(of) / Relative 区分（独有 `id`） */
const isNodeTarget = (t: IRTarget): t is IRNodeTarget =>
  typeof t === 'object' && !Array.isArray(t) && 'id' in t;

/** target 是否 between 比例点（`{ between, t }`）；独有 `between` 字段 */
const isBetween = (t: IRTarget): t is IRBetweenPosition =>
  typeof t === 'object' && !Array.isArray(t) && 'between' in t;

/** 解析 NodeTarget 的 anchor（非 undefined）到世界坐标：命名 / 角度走 resolveAnchor（可选连接面），`{ side, t }` 恒走视觉形状（不传 surface） */
const resolveAnchorRef = (
  node: NodeLayout,
  anchor: NonNullable<IRNodeTarget['anchor']>,
  surface: IRConnectSurface | undefined,
): IRPosition => {
  if (typeof anchor === 'number') return resolveAnchor(node, String(anchor), surface);
  if (typeof anchor === 'string') return resolveAnchor(node, anchor, surface);
  return resolveEdgePoint(node, anchor.side, anchor.t);
};

/** anchor/边点解析后叠加世界系 offset（不随节点 rotate 旋转） */
const addOffset = (base: IRPosition, offset: IRNodeTarget['offset']): IRPosition =>
  offset ? [base[0] + offset[0], base[1] + offset[1]] : base;

/**
 * 求 step.to 的参考点（给 boundary clip 算方向 / 折角 corner 用）
 * @description 三态：`'A'`(auto) 节点中心；`'A.<anchor>'`/`'A.<deg>'` 显式锚点 refPoint=endpoint 位置不随邻居变。直接坐标/极坐标解析为笛卡尔。
 *   string id lookup 拿到的 layout 已是全局坐标——不走 scopeChain 投影；Position / Polar /
 *   At / Offset 字面量经 `resolvePosition(..., scopeChain)` 拿到当前 scope 局部坐标后
 *   `applyTransformChain` 投回全局。`scopeChain=[]` 等价 v0.1（恒等）。
 */
export const refPointOfTarget = (
  target: IRTarget,
  nameStack: NameStack,
  scopeChain: ReadonlyArray<Transform> = [],
): IRPosition | null => {
  // 对象形态 NodeTarget：{ id, anchor?, offset? }（refPoint 用——anchor 缺省取中心，中心不受 boundary 影响）
  if (isNodeTarget(target)) {
    const node = nameStack.lookup(target.id);
    if (!node) return null;
    const base =
      target.anchor === undefined
        ? ([node.rect.x, node.rect.y] as IRPosition)
        : resolveAnchorRef(node, target.anchor, target.boundary ?? node.connectAs);
    return addOffset(base, target.offset);
  }
  // between 比例点：两端点各 resolve 成世界坐标后 lerp（端点可嵌套 between，递归）；
  // lerp 仿射 ⇒ 全局 lerp = 局部 lerp 投全局，无需逐端点反投影
  if (isBetween(target)) {
    const a = refPointOfTarget(target.between[0], nameStack, scopeChain);
    const b = refPointOfTarget(target.between[1], nameStack, scopeChain);
    if (!a || !b) return null;
    const mid = lerpPoint(a, b, target.t);
    // finite 守卫：端点（极坐标 radius=Infinity / offset NaN 等）或手搓 t=NaN 会产非 finite 中点；
    // 返回 null 走"端点未解析"路径（Step.to → warn / Node·Coordinate → throw），不让非 finite 进 Scene
    if (!Number.isFinite(mid[0]) || !Number.isFinite(mid[1])) return null;
    return mid;
  }
  // relative/relativeAccumulate 已被 normalizeRelativeTargets 预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('relative' in target || 'relativeAccumulate' in target)) {
    return null;
  }
  const local = resolvePosition(target, nameStack, undefined, scopeChain);
  if (!local) return null;
  return scopeChain.length === 0 ? local : applyTransformChain(local, scopeChain);
};

/** 折角中间点：`-|` → (curr.x, prev.y)；`|-` → (prev.x, curr.y) */
export const cornerOf = (
  prev: IRPosition,
  curr: IRPosition,
  via: '-|' | '|-',
): IRPosition =>
  via === '-|' ? [curr[0], prev[1]] : [prev[0], curr[1]];

/**
 * 在 toward 方向算 step.to 的实际绘制端点
 * @description 节点 auto `'A'`：按 shape 走 boundaryPointOf 求中心→toward 射线交点；命名 anchor/角度：位置已定不受 toward 影响；直接坐标/极坐标：解析后返回；失败返回 null。
 *   string id lookup 拿到的 layout 已是全局坐标；Position / Polar / At / Offset 字面量经
 *   `resolvePosition(..., scopeChain)` 拿到当前 scope 局部坐标后 `applyTransformChain` 投回全局。
 */
export const clipForTarget = (
  target: IRTarget,
  toward: IRPosition,
  nameStack: NameStack,
  scopeChain: ReadonlyArray<Transform> = [],
): IRPosition | null => {
  // 对象形态 NodeTarget：{ id, anchor?, offset? }（clip 用——anchor 缺省按连接面边界贴 toward）
  if (isNodeTarget(target)) {
    const node = nameStack.lookup(target.id);
    if (!node) return null;
    const surface = target.boundary ?? node.connectAs;
    const base =
      target.anchor === undefined
        ? boundaryPointOf(node, toward, surface)
        : resolveAnchorRef(node, target.anchor, surface);
    return addOffset(base, target.offset);
  }
  // between 比例点是固定点（非节点边界），直接走 refPointOfTarget（不随 toward 变）
  if (isBetween(target)) {
    return refPointOfTarget(target, nameStack, scopeChain);
  }
  // relative/relativeAccumulate 已被预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('relative' in target || 'relativeAccumulate' in target)) {
    return null;
  }
  const local = resolvePosition(target, nameStack, undefined, scopeChain);
  if (!local) return null;
  return scopeChain.length === 0 ? local : applyTransformChain(local, scopeChain);
};

/** 两个 IRPosition 两分量精确相等（未 round） */
export const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** 把 p 朝 target 方向移动 dist */
export const shiftToward = (p: IRPosition, target: IRPosition, dist: number): IRPosition => {
  const dx = target[0] - p[0];
  const dy = target[1] - p[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0 || dist === 0) return p;
  return [p[0] + (dx / len) * dist, p[1] + (dy / len) * dist];
};
