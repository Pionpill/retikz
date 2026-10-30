import type { Transform } from '../../contract';
import type { NodeReferenceGeometry, PathTargetView, TargetResolution } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import { resolvePositionTarget } from '../../resolve/position';
import type { IRNodeTarget, IRPosition, IRRelativeAccumulateTarget, IRRelativeTarget, IRTarget } from '../../schemas';
import { isNodeTargetLike, isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../shared';
import type { NodeBoundaryContext } from '../node';
import { boundaryPointOf, clipNodePolyline, createNodeBoundaryContext } from '../node';
import type { ComposedScopeTransform } from '../transform';
import { applyScopeTransform, composeScopeTransform, inverseScopeTransform } from '../transform';
import { resolveAnchorRef } from './anchor-cache';

/** 判断 target 是否为按 id 引用节点或坐标的对象目标 */
const isNodeTarget = (t: IRTarget): t is IRNodeTarget => isNodeTargetLike(t);

/** 判断 target 是否需要由节点边界自动裁剪决定端点 */
const isAutoBoundaryTarget = (target: IRTarget): boolean =>
  isNodeTarget(target) && target.anchor === undefined && target.offset === undefined;

/** 判断 target 是否为进入 emit 前应被 path 游标归一化的相对端点 */
const isRelative = (t: IRTarget): t is IRRelativeTarget | IRRelativeAccumulateTarget =>
  isRelativeTargetLike(t) || isRelativeAccumulateTargetLike(t);

/** 在世界坐标系叠加节点目标的 offset */
const addOffset = (base: IRPosition, offset: IRNodeTarget['offset']): IRPosition =>
  offset ? [base[0] + offset[0], base[1] + offset[1]] : base;

/** 在 resolving 阶段绑定 Path target，并压缩为既有公开 TargetResolution */
export const bindPathTarget = (target: IRTarget, context: PositionTargetResolveContext): TargetResolution | null => {
  if (isRelative(target)) return null;

  const resolution = resolvePositionTarget(target, context);

  return {
    target,
    point: resolution.point,
    referencePoint: resolution.referencePoint,
    ...(resolution.reference === undefined ? {} : { node: resolution.reference.node }),
    ...(resolution.boundaryResolution === undefined ? {} : { boundaryResolution: resolution.boundaryResolution }),
  };
};

/** 稳定序列化 target，供 resolving 绑定与 compile 消费共享同一查找键 */
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

/** 从 resolving 结果构造只读 target view；该 view 不再访问 NamespaceStack 或 provider registry */
export const pathTargetViewOf = (
  targets: ReadonlyMap<string, TargetResolution>,
  warn?: (code: string, message: string, node?: NodeReferenceGeometry) => void,
  nodeBoundaryContext: NodeBoundaryContext = createNodeBoundaryContext(),
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
      if (binding?.node === undefined || !isNodeTarget(target) || !isAutoBoundaryTarget(target)) return [...points];

      const transform = resolveTransform(scopeChain);
      const node = binding.node;
      const clipped = clipNodePolyline(
        node,
        points.map(position => applyScopeTransform(position, transform)),
        target.boundary ?? node.boundary,
        binding.boundaryResolution,
        warn === undefined ? undefined : (code, message) => warn(code, message, node),
        nodeBoundaryContext.get(node),
      );
      return clipped.map(position => inverseScopeTransform(position, transform));
    },
    clipTarget: (target, toward, scopeChain) => {
      const binding = bindingOf(target);
      if (binding?.node === undefined || !isNodeTarget(target)) return pointOf(target);

      const transform = resolveTransform(scopeChain);
      const node = binding.node;
      const boundary = target.boundary ?? node.boundary;
      const towardGlobal = scopeChain.length === 0 ? toward : applyScopeTransform(toward, transform);
      const base =
        target.anchor === undefined
          ? boundaryPointOf(
              node,
              towardGlobal,
              boundary,
              binding.boundaryResolution,
              warn === undefined ? undefined : (code, message) => warn(code, message, node),
              nodeBoundaryContext.get(node),
            )
          : resolveAnchorRef(node, target.anchor, boundary, binding.boundaryResolution, nodeBoundaryContext.get(node));
      const global = addOffset(base, target.offset);

      return scopeChain.length === 0 ? global : inverseScopeTransform(global, transform);
    },
  };
};
