import type { PropertyPath } from '@retikz/foundation';

import type { Transform } from '../../contract';
import type { BoundaryResolution, NodeBoundaryResolver } from '../../resolve';
import { boundaryKey } from '../../resolve';
import type { IRBetweenPosition, IRNodeTarget, IRPosition } from '../../schemas';
import type { CompiledNodeLayout, NodeBoundaryStore } from '../node';
import { resolveAnchorRef } from '../node';
import type { ComposedScopeTransform } from '../shared';
import { applyScopeTransform, composeScopeTransform, inverseScopeTransform } from '../shared';
import { resolvePositionTarget } from './target';
import type { PositionReferenceView, PositionTargetResolveContext } from './types';

/** 仅解析目标额外指定的连接面；视觉形状与默认连接面由几何消费端读取布局 */
const resolveTargetBoundary = (
  node: CompiledNodeLayout,
  target: IRNodeTarget,
  resolveExplicitBoundary?: NodeBoundaryResolver,
  irPath?: PropertyPath,
): BoundaryResolution | undefined => {
  const boundary = target.boundary;
  if (boundary === undefined || boundary === 'shape') return undefined;
  if (boundaryKey(boundary) === boundaryKey(node.boundarySource)) return undefined;
  if (resolveExplicitBoundary === undefined) return undefined;

  return resolveExplicitBoundary(boundary, {
    visualDef: node.shape.definition,
    visualParams: node.shape.params,
    irPath,
  });
};

/** 创建位置求值上下文所需的编译状态 */
export type InputPositionResolveContext = Readonly<{
  /** 当前命名空间 */
  lookupReference: (id: string) => PositionReferenceView | undefined;
  /** 与节点布局及路径裁剪共享的几何消费状态 */
  nodeBoundaryStore?: NodeBoundaryStore;
  /** 相对定位默认距离 */
  nodeDistance: number;
  /** 当前 Scope 累积 transform */
  transformChain?: ReadonlyArray<Transform>;
  /** traversal 已合成的当前 Scope 变换 */
  composedTransform?: ComposedScopeTransform;
  /** 显式连接面绑定能力 */
  resolveExplicitBoundary?: NodeBoundaryResolver;
}>;

/**
 * 从编译状态创建位置与目标求值上下文
 * @description 直接复用查询返回的布局引用与来源路径，不构造中间引用副本
 */
export const createPositionResolveContext = (input: InputPositionResolveContext): PositionTargetResolveContext => {
  const {
    lookupReference,
    nodeBoundaryStore,
    nodeDistance,
    transformChain = [],
    composedTransform,
    resolveExplicitBoundary,
  } = input;

  const transform = composedTransform ?? composeScopeTransform(transformChain);

  const toLocal = (world: IRPosition): IRPosition =>
    transformChain.length === 0 ? [world[0], world[1]] : inverseScopeTransform(world, transform);
  const toWorld = (local: IRPosition): IRPosition =>
    transformChain.length === 0 ? [local[0], local[1]] : applyScopeTransform(local, transform);
  const boundaryResolutionOf = (target: IRNodeTarget, reference: PositionReferenceView) =>
    resolveTargetBoundary(reference.layout, target, resolveExplicitBoundary, reference.irPath);

  const pointOfNodeTarget = (
    target: IRNodeTarget,
    reference: PositionReferenceView,
    boundaryResolution: BoundaryResolution | undefined,
  ): IRPosition => {
    const node = reference.layout;
    if (target.anchor === undefined) return [node.geometry.rect.x, node.geometry.rect.y];
    const state = nodeBoundaryStore?.get(node);
    return resolveAnchorRef(node, target.anchor, target.boundary ?? node.boundarySource, boundaryResolution, {
      ...state,
      irPath: reference.irPath ?? state?.irPath,
    });
  };

  const resolveBetweenWorld = (between: IRBetweenPosition): IRPosition | null =>
    resolvePositionTarget(between, context).referencePoint;

  const context: PositionTargetResolveContext = {
    nodeDistance,
    lookupReference,
    toLocal,
    toWorld,
    boundaryResolutionOf,
    pointOfNodeTarget,
    resolveBetweenWorld,
  };

  return context;
};
