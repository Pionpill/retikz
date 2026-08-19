import { boundsCenter, boundsOf } from '@retikz/math';

import type { Transform } from '../contract';
import type { PositionTargetResolveContext } from '../resolve/position';
import type { IRPosition, IRScopeSelfPoint, IRTransform } from '../schemas';
import type { Rect } from '../shared/geometry';
import type { NodeLayout } from './node';

import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import { resolveTransformTranslation } from '../resolve/position';
import { Anchor } from '../shared';
import { rect as rectOps } from '../shared/geometry';
import { outerRectOf } from './node';
import { RetikzCompileInvariantError } from './probe-failure';
import { resolveAnchorRefUncached } from './reference';

/** scope transform lowering 所需的编译上下文 */
export type LowerScopeTransformsContext = {
  /** Position Source IR 确定化上下文 */
  positionContext: PositionTargetResolveContext;
  /** transform 引用解析失败时的回调 */
  onUnresolved?: (failed: IRTransform) => void;
  /** pivot 解析使用的 Scope 固有包络 layout */
  intrinsicLayout?: NodeLayout;
};

/** 断言 self point / placement 计算结果是可发布的有限坐标 */
const assertFiniteScopePoint = (point: IRPosition, label: string): IRPosition => {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `${label} must resolve to a finite point`);
  }
  return point;
};

/**
 * 在 Scope 固有包络上解析 self point
 * @description `origin` 与显式坐标不依赖包络；anchor 引用统一走现有 shape / boundary resolver
 */
export const resolveScopeSelfPoint = (point: IRScopeSelfPoint, intrinsicLayout: NodeLayout | undefined): IRPosition => {
  if (point === 'origin') return [0, 0];
  if (Array.isArray(point)) return assertFiniteScopePoint([point[0], point[1]], 'scope self point');
  if (intrinsicLayout === undefined) {
    throw new RetikzCompileInvariantError(
      'internal: intrinsic Scope layout is required to resolve an anchor self point',
    );
  }
  return assertFiniteScopePoint(resolveAnchorRefUncached(intrinsicLayout, point), 'scope self point');
};

/**
 * 将已确定的 Scope transform lowered 为 Scene transform。
 *
 * @description 该步骤依赖当前 namespace，因此保留在 traversal 编译过程中执行；输出只包含 renderer
 * 可直接消费的 `translate` / `rotate` / `scale` 形态。引用解析失败时返回 null
 */
export const lowerScopeTransforms = (
  transforms: ReadonlyArray<IRTransform>,
  context: LowerScopeTransformsContext,
): Array<Transform> | null => {
  const { positionContext, onUnresolved, intrinsicLayout } = context;
  const out: Array<Transform> = [];
  for (const t of transforms) {
    switch (t.kind) {
      case 'translate':
      case 'polar-translate':
      case 'at-translate':
      case 'offset-translate':
      case 'between-translate': {
        const resolved = resolveTransformTranslation(t, positionContext)?.localPoint;
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'rotate': {
        const r: Transform = { kind: 'rotate', degrees: t.degrees };
        if (t.pivot !== undefined && t.pivot !== 'origin') {
          const [cx, cy] = resolveScopeSelfPoint(t.pivot, intrinsicLayout);
          r.cx = cx;
          r.cy = cy;
        }
        out.push(r);
        break;
      }
      case 'scale': {
        const s: Transform = { kind: 'scale', x: t.x };
        if (t.y !== undefined) s.y = t.y;
        if (t.pivot === undefined || t.pivot === 'origin') {
          out.push(s);
          break;
        }
        const [px, py] = resolveScopeSelfPoint(t.pivot, intrinsicLayout);
        if (px === 0 && py === 0) {
          out.push(s);
          break;
        }
        out.push({ kind: 'translate', x: px, y: py }, s, { kind: 'translate', x: -px, y: -py });
        break;
      }
    }
  }
  return out;
};

/** 收集一组 NodeLayout 的全局 4 角点，供 AABB / MEC 等包络复用 */
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

/** 计算一组 layout 的全局 AABB；空数组返回 null */
export const computeScopeBoundingBox = (layouts: ReadonlyArray<NodeLayout>): Rect | null => {
  const bounds = boundsOf(collectScopeCornerPoints(layouts));
  if (bounds === undefined) return null;
  const center = boundsCenter(bounds);
  return { x: center[0], y: center[1], width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
};
