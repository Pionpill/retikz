import type { NodeReferenceView, PathTargetView, TargetResolution } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type {
  FoldStepViaValue,
  IRNodeTarget,
  IRPosition,
  IRRelativeAccumulateTarget,
  IRRelativeTarget,
  IRTarget,
} from '../../schemas';

import { resolvePositionTarget } from '../../resolve/position';
import { FoldStepVia } from '../../schemas';
import { isNodeTargetLike, isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../shared';
import { point } from '../../shared/geometry';
import { boundaryPointOf } from '../node';
import { resolveAnchorRef } from '../reference';
import { applyTransformChain, inverseTransformChain } from '../transform';

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

/**
 * 根据 fold step 的方向计算正交折角点
 * @description 两段 fold 返回一个角点；三段 fold 返回两个共享中间轴的角点
 */
export const foldCornersOf = (
  prev: IRPosition,
  curr: IRPosition,
  via: FoldStepViaValue,
  fraction = 0.5,
): Array<IRPosition> => {
  if (via === FoldStepVia.HorizontalThenVertical) return [[curr[0], prev[1]]];
  if (via === FoldStepVia.VerticalThenHorizontal) return [[prev[0], curr[1]]];
  if (via === FoldStepVia.HorizontalVerticalHorizontal) {
    const x = prev[0] + (curr[0] - prev[0]) * fraction;
    return [
      [x, prev[1]],
      [x, curr[1]],
    ];
  }
  const y = prev[1] + (curr[1] - prev[1]) * fraction;
  return [
    [prev[0], y],
    [curr[0], y],
  ];
};

/** target 裁剪解析所需上下文 */
export type ClipForTargetContext = {
  /** 当前 Path 所在 Scope 的 position resolver context */
  positionContext: PositionTargetResolveContext;
};

/**
 * 解析 target 在 toward 方向上的实际绘制端点
 * @description 未指定 anchor 的 NodeTarget 会按连接面裁剪到节点边界；显式 anchor、between 和普通坐标目标
 * 解析为固定点
 */
export const clipForTarget = (
  target: IRTarget,
  toward: IRPosition,
  context: ClipForTargetContext,
): IRPosition | null => {
  const { positionContext } = context;
  // NodeTarget 的裁剪端点可能随 toward 落在不同连接面位置。
  if (isNodeTarget(target)) {
    const resolution = resolvePositionTarget(target, positionContext);
    const node = resolution.reference?.node;
    if (node === undefined) return null;
    const boundary = target.boundary ?? node.boundary;
    const towardGlobal = positionContext.toWorld(toward);
    const base =
      target.anchor === undefined
        ? boundaryPointOf(node, towardGlobal, boundary, resolution.boundaryResolution)
        : resolveAnchorRef(node, target.anchor, boundary, resolution.boundaryResolution);
    const global = addOffset(base, target.offset);
    return positionContext.toLocal(global);
  }
  // relative 目标应已在进入 path emit 前预解析。
  if (isRelative(target)) return null;
  return resolvePositionTarget(target, positionContext).point;
};

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
  warn?: (code: string, message: string, node?: NodeReferenceView) => void,
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
    clipTarget: (target, toward, scopeChain) => {
      const binding = bindingOf(target);
      if (binding?.node === undefined || !isNodeTarget(target)) return pointOf(target);
      const node = binding.node;
      const boundary = target.boundary ?? node.boundary;
      const towardGlobal = scopeChain.length === 0 ? toward : applyTransformChain(toward, scopeChain);
      const base =
        target.anchor === undefined
          ? boundaryPointOf(
              node,
              towardGlobal,
              boundary,
              binding.boundaryResolution,
              warn === undefined ? undefined : (code, message) => warn(code, message, node),
            )
          : resolveAnchorRef(node, target.anchor, boundary, binding.boundaryResolution);
      const global = addOffset(base, target.offset);
      return scopeChain.length === 0 ? global : inverseTransformChain(global, scopeChain);
    },
  };
};

/** 判断两个已解析坐标是否逐分量精确相等 */
export const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean => !!a && !!b && point.isEqual(a, b);
