import type { IRPosition, IRTarget } from '../../ir';
import { resolveAnchor } from '../anchor-cache';
import type { NameStack } from '../name-stack';
import { boundaryPointOf } from '../node';
import { parseNodeRef } from '../parseTarget';
import { resolvePosition } from '../position';

/**
 * 求 step.to 的参考点（给 boundary clip 算方向 / 折角 corner 用）
 * @description 三态：`'A'`(auto) 节点中心；`'A.<anchor>'`/`'A.<deg>'` 显式锚点 refPoint=endpoint 位置不随邻居变。直接坐标/极坐标解析为笛卡尔
 */
export const refPointOfTarget = (
  target: IRTarget,
  nameStack: NameStack,
): IRPosition | null => {
  if (typeof target === 'string') {
    const ref = parseNodeRef(target);
    const node = nameStack.lookup(ref.id);
    if (!node) return null;
    switch (ref.kind) {
      case 'node':
        return [node.rect.x, node.rect.y];
      case 'anchor':
        return resolveAnchor(node, ref.anchor);
      case 'angle':
        return resolveAnchor(node, String(ref.angle));
    }
  }
  // relative/relativeAccumulate 已被 normalizeRelativeTargets 预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('relative' in target || 'relativeAccumulate' in target)) {
    return null;
  }
  return resolvePosition(target, nameStack);
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
 * @description 节点 auto `'A'`：按 shape 走 boundaryPointOf 求中心→toward 射线交点；命名 anchor/角度：位置已定不受 toward 影响；直接坐标/极坐标：解析后返回；失败返回 null
 */
export const clipForTarget = (
  target: IRTarget,
  toward: IRPosition,
  nameStack: NameStack,
): IRPosition | null => {
  if (typeof target === 'string') {
    const ref = parseNodeRef(target);
    const node = nameStack.lookup(ref.id);
    if (!node) return null;
    switch (ref.kind) {
      case 'node':
        return boundaryPointOf(node, toward);
      case 'anchor':
        return resolveAnchor(node, ref.anchor);
      case 'angle':
        return resolveAnchor(node, String(ref.angle));
    }
  }
  // relative/relativeAccumulate 已被预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('relative' in target || 'relativeAccumulate' in target)) {
    return null;
  }
  return resolvePosition(target, nameStack);
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
