import { boundsCenter, boundsOf } from '@retikz/math';

import type { Transform } from '../contract';
import type {
  IRAtPosition,
  IRBetweenPosition,
  IROffsetPosition,
  IRPosition,
  IRTransform,
  PolarPosition,
} from '../schemas';
import type { Rect } from '../shared/geometry';
import type { NamespaceStack } from './namespace';
import type { NodeLayout } from './node';
import type { ResolveBetweenGlobal } from './position';

import { Anchor } from '../shared';
import { rect as rectOps } from '../shared/geometry';
import { outerRectOf } from './node';
import { resolvePosition } from './position';

/** scope transform lowering 所需的编译上下文。 */
export type LowerScopeTransformsContext = {
  /** id 查询栈。 */
  namespaceStack: NamespaceStack;
  /** 相对定位默认距离。 */
  nodeDistance?: number;
  /** between 端点的全局坐标解析器。 */
  resolveBetweenGlobal?: ResolveBetweenGlobal;
  /** transform 引用解析失败时的回调。 */
  onUnresolved?: (failed: IRTransform) => void;
};

/**
 * 将 scope transform 的 translate-like IR 变体 lowered 为 Scene transform。
 *
 * @description 该步骤依赖当前 namespace，因此保留在 traversal 编译过程中执行；输出只包含 renderer
 * 可直接消费的 `translate` / `rotate` / `scale` 形态。引用解析失败时返回 null。
 */
export const lowerScopeTransforms = (
  transforms: ReadonlyArray<IRTransform>,
  context: LowerScopeTransformsContext,
): Array<Transform> | null => {
  const { namespaceStack, nodeDistance, resolveBetweenGlobal, onUnresolved } = context;
  const out: Array<Transform> = [];
  for (const t of transforms) {
    switch (t.kind) {
      case 'translate':
        out.push({ kind: 'translate', x: t.x, y: t.y });
        break;
      case 'polar-translate': {
        const polar: PolarPosition = { angle: t.angle, radius: t.radius };
        if (t.origin !== undefined) polar.origin = t.origin;
        const resolved = resolvePosition(polar, { namespaceStack, nodeDistance });
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'at-translate': {
        const at: IRAtPosition = { direction: t.direction, of: t.of };
        if (t.distance !== undefined) at.distance = t.distance;
        const resolved = resolvePosition(at, { namespaceStack, nodeDistance });
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'offset-translate': {
        const off: IROffsetPosition = {
          of: t.of,
          offset: t.offset ?? [0, 0],
        };
        const resolved = resolvePosition(off, { namespaceStack, nodeDistance });
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'between-translate': {
        const between: IRBetweenPosition = { between: t.between, fraction: t.fraction };
        const resolved = resolvePosition(between, { namespaceStack, nodeDistance, resolveBetweenGlobal });
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'rotate': {
        const r: Transform = { kind: 'rotate', degrees: t.degrees };
        if (t.cx !== undefined) r.cx = t.cx;
        if (t.cy !== undefined) r.cy = t.cy;
        out.push(r);
        break;
      }
      case 'scale': {
        const s: Transform = { kind: 'scale', x: t.x };
        if (t.y !== undefined) s.y = t.y;
        out.push(s);
        break;
      }
    }
  }
  return out;
};

/** 收集一组 NodeLayout 的全局 4 角点，供 AABB / MEC 等包络复用。 */
export const collectScopeCornerPoints = (layouts: ReadonlyArray<NodeLayout>): Array<IRPosition> => {
  const points: Array<IRPosition> = [];
  for (const layout of layouts) {
    const outerRect = outerRectOf(layout);
    points.push(
      rectOps.anchor(outerRect, Anchor.TopLeft),
      rectOps.anchor(outerRect, Anchor.TopRight),
      rectOps.anchor(outerRect, Anchor.BottomLeft),
      rectOps.anchor(outerRect, Anchor.BottomRight),
    );
  }
  return points;
};

/** 计算一组 layout 的全局 AABB；空数组返回 null。 */
export const computeScopeBoundingBox = (layouts: ReadonlyArray<NodeLayout>): Rect | null => {
  const bounds = boundsOf(collectScopeCornerPoints(layouts));
  if (bounds === undefined) return null;
  const center = boundsCenter(bounds);
  return { x: center[0], y: center[1], width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
};
