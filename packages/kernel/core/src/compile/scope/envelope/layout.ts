import type { CenteredBox } from '@retikz/math';
import { circle } from '@retikz/math';

import type { CanonicalScope } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import { ScopeBoundingShape } from '../../../schemas';
import { calculateOuterBoundaryRect } from '../../boundary';
import type { CompiledReferenceGeometry } from '../../reference';
import type { CompiledScopeGeometry } from '../types';

/** 按原有顺序访问子布局边界点，旋转系数在每个节点内共用 */
const visitScopeCornerPoints = (
  layouts: ReadonlyArray<CompiledReferenceGeometry>,
  include: (x: number, y: number) => void,
): void => {
  for (const layout of layouts) {
    if ('position' in layout) {
      include(layout.position[0], layout.position[1]);
      continue;
    }
    const outerRect = calculateOuterBoundaryRect(layout);
    const { x, y, width, height } = outerRect;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const angle = outerRect.rotate ?? 0;
    if (angle === 0) {
      include(x + -halfWidth, y + -halfHeight);
      include(x + halfWidth, y + -halfHeight);
      include(x + -halfWidth, y + halfHeight);
      include(x + halfWidth, y + halfHeight);
    } else {
      // ⚡每节点四角复用同次sin/cos，保持localToWorld的运算和访问顺序
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      include(x + -halfWidth * cos - -halfHeight * sin, y + -halfWidth * sin + -halfHeight * cos);
      include(x + halfWidth * cos - -halfHeight * sin, y + halfWidth * sin + -halfHeight * cos);
      include(x + -halfWidth * cos - halfHeight * sin, y + -halfWidth * sin + halfHeight * cos);
      include(x + halfWidth * cos - halfHeight * sin, y + halfWidth * sin + halfHeight * cos);
    }
  }
};

/** 最小圆需要保留点集；不改变Math算法及输入顺序 */
const collectScopeCornerPoints = (layouts: ReadonlyArray<CompiledReferenceGeometry>): Array<IRPosition> => {
  const points: Array<IRPosition> = [];
  visitScopeCornerPoints(layouts, (x, y) => points.push([x, y]));
  return points;
};

/** 计算一组 layout 的全局 AABB；空数组返回 null */
const calculateScopeBoundingBox = (layouts: ReadonlyArray<CompiledReferenceGeometry>): CenteredBox | null => {
  if (layouts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  // ⚡矩形包络直接扫描角点标量，省去点集分配和二次遍历
  visitScopeCornerPoints(layouts, (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
};

/** 从真实子布局聚合 rectangle / circle 包络，不经过节点解析或文字测量 */
export const layoutScopeEnvelope = (
  canon: CanonicalScope,
  scopeLayouts: ReadonlyArray<CompiledReferenceGeometry>,
): CompiledScopeGeometry => {
  let rect: CenteredBox;
  if (canon.envelope.kind === ScopeBoundingShape.Circle) {
    const points = collectScopeCornerPoints(scopeLayouts);
    const envelope = points.length === 0 ? undefined : circle.minimalEnclosing(points);
    rect = {
      x: envelope?.center[0] ?? 0,
      y: envelope?.center[1] ?? 0,
      width: (envelope?.radius ?? 0) * 2,
      height: (envelope?.radius ?? 0) * 2,
      rotate: 0,
    };
  } else {
    rect = { rotate: 0, ...(calculateScopeBoundingBox(scopeLayouts) ?? { x: 0, y: 0, width: 0, height: 0 }) };
  }
  return { rect, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
};
