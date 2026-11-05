import type { PropertyPath } from '@retikz/foundation';

import type { Transform } from '../../contract';
import type { IRNodeTarget, IRPosition, IRRelativeAccumulateTarget, IRRelativeTarget, IRTarget } from '../../schemas';
import { isNodeTargetLike, isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../shared';
import type { BoundaryStore } from '../boundary';
import { evaluateBoundaryPoint, clipBoundaryPolyline, createBoundaryStore } from '../boundary';
import type { PositionTargetEvaluateContext } from '../reference';
import { evaluatePositionTarget } from '../reference';
import type { ComposedScopeTransform } from '../shared';
import { applyScopeTransform, composeScopeTransform, inverseScopeTransform } from '../shared';
import type { PathTargetView, TargetResolution } from './types';

/** 判断 target 是否为按 id 引用节点或坐标的对象目标 */
const isNodeTarget = (t: IRTarget): t is IRNodeTarget => isNodeTargetLike(t);

/** 判断 target 是否需要由节点边界自动裁剪决定端点 */
export const isAutoBoundaryTarget = (target: IRTarget): boolean =>
  isNodeTarget(target) && target.anchor === undefined && target.offset === undefined;

/** 判断 target 是否为进入 emit 前应被 path 游标归一化的相对端点 */
const isRelative = (t: IRTarget): t is IRRelativeTarget | IRRelativeAccumulateTarget =>
  isRelativeTargetLike(t) || isRelativeAccumulateTargetLike(t);

/** 在世界坐标系叠加节点目标的 offset */
const addOffset = (base: IRPosition, offset: IRNodeTarget['offset']): IRPosition =>
  offset ? [base[0] + offset[0], base[1] + offset[1]] : base;

/** 在编译阶段绑定路径目标，保留布局引用与来源 */
export const bindPathTarget = (target: IRTarget, context: PositionTargetEvaluateContext): TargetResolution | null => {
  if (isRelative(target)) return null;

  const resolution = evaluatePositionTarget(target, context);

  return {
    target,
    point: resolution.point,
    referencePoint: resolution.referencePoint,
    ...(resolution.reference === undefined || 'position' in resolution.reference.geometry
      ? {}
      : { geometry: resolution.reference.geometry, irPath: resolution.reference.irPath }),
    ...(resolution.canonicalBoundary === undefined ? {} : { canonicalBoundary: resolution.canonicalBoundary }),
  };
};

/** 稳定序列化目标，使绑定与几何消费共享同一查找键 */
export const targetKeyOf = (target: IRTarget): string => {
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, stable(item)]),
      );
    }

    return value;
  };

  return JSON.stringify(stable(target));
};

/** 从目标绑定结果构造只读查询视图，不再访问命名空间或定义注册表 */
export const pathTargetViewOf = (
  targets: ReadonlyMap<string, TargetResolution>,
  warn?: (code: string, message: string, reference?: { irPath?: PropertyPath }) => void,
  boundaryStore: BoundaryStore = createBoundaryStore(),
  resolveTransform: (chain: ReadonlyArray<Transform>) => ComposedScopeTransform = composeScopeTransform,
): PathTargetView => {
  const byTarget = new Map<string, TargetResolution>();

  for (const binding of targets.values()) byTarget.set(targetKeyOf(binding.target), binding);

  const bindingOf = (target: IRTarget): TargetResolution | undefined => byTarget.get(targetKeyOf(target));

  const pointOf = (target: IRTarget): IRPosition | null => {
    if (isRelative(target)) return null;

    const binding = bindingOf(target);
    if (binding !== undefined) return binding.point;

    return Array.isArray(target) ? target : null;
  };

  return {
    pointOfTarget: target => pointOf(target),
    referenceOfTarget: target => bindingOf(target)?.referencePoint ?? pointOf(target),
    clipPolylineTarget: (target, points, scopeChain) => {
      const binding = bindingOf(target);
      if (binding?.geometry === undefined || !isNodeTarget(target) || !isAutoBoundaryTarget(target)) return [...points];

      const transform = resolveTransform(scopeChain);
      const node = binding.geometry;
      const clipped = clipBoundaryPolyline(
        node,
        points.map(position => applyScopeTransform(position, transform)),
        target.boundary,
        binding.canonicalBoundary,
        warn === undefined ? undefined : (code, message) => warn(code, message, binding),
        {
          ...boundaryStore.getOrCreateState(node.shape),
          irPath: binding.irPath ?? boundaryStore.getOrCreateState(node.shape).irPath,
        },
      );
      return clipped.map(position => inverseScopeTransform(position, transform));
    },
    clipTarget: (target, toward, scopeChain) => {
      const binding = bindingOf(target);
      if (binding?.geometry === undefined || !isNodeTarget(target)) return pointOf(target);

      const transform = resolveTransform(scopeChain);
      const node = binding.geometry;
      const boundary = target.boundary;
      const towardGlobal = scopeChain.length === 0 ? toward : applyScopeTransform(toward, transform);
      const base =
        target.anchor === undefined
          ? evaluateBoundaryPoint(
              node,
              towardGlobal,
              boundary,
              binding.canonicalBoundary,
              warn === undefined ? undefined : (code, message) => warn(code, message, binding),
              {
                ...boundaryStore.getOrCreateState(node.shape),
                irPath: binding.irPath ?? boundaryStore.getOrCreateState(node.shape).irPath,
              },
            )
          : boundaryStore.getOrCreateAnchor(node, target.anchor, boundary, binding.canonicalBoundary, {
              ...boundaryStore.getOrCreateState(node.shape),
              irPath: binding.irPath ?? boundaryStore.getOrCreateState(node.shape).irPath,
            });
      const global = addOffset(base, target.offset);

      return scopeChain.length === 0 ? global : inverseScopeTransform(global, transform);
    },
  };
};
