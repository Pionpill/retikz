import type { PropertyPath } from '@retikz/foundation';

import type { Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNodeBoundary, NodeBoundaryResolver } from '../../resolve';
import type { IRBetweenPosition, IRNodeTarget, IRPosition } from '../../schemas';
import { isAnchor } from '../../shared';
import type { BoundaryStore, CompiledBoundaryGeometry } from '../boundary';
import { createBoundaryStore } from '../boundary';
import type { ComposedScopeTransform } from '../shared';
import { applyScopeTransform, composeScopeTransform, inverseScopeTransform } from '../shared';
import { evaluatePositionTarget } from './target';
import type { PositionReferenceView, PositionTargetEvaluateContext, ReferenceReadKind } from './types';

/** 仅解析目标额外指定的连接面；视觉形状与默认连接面由几何消费端读取布局 */
const bindTargetBoundary = (
  geometry: CompiledBoundaryGeometry,
  target: IRNodeTarget,
  resolveExplicitBoundary?: NodeBoundaryResolver,
  irPath?: PropertyPath,
): CanonicalNodeBoundary | undefined => {
  const boundary = target.boundary;
  if (boundary === undefined || boundary === 'shape') return undefined;
  if (resolveExplicitBoundary === undefined) return undefined;

  return resolveExplicitBoundary(boundary, {
    visualDef: geometry.shape.definition,
    visualParams: geometry.shape.params,
    irPath,
  });
};

/** 创建位置求值上下文所需的编译状态 */
export type InputPositionEvaluateContext = Readonly<{
  /** 当前命名空间 */
  lookupReference: (id: string, kind?: ReferenceReadKind) => PositionReferenceView | undefined;
  /** 与节点布局及路径裁剪共享的几何消费状态 */
  boundaryStore?: BoundaryStore;
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
export const createPositionEvaluateContext = (input: InputPositionEvaluateContext): PositionTargetEvaluateContext => {
  const {
    lookupReference,
    boundaryStore = createBoundaryStore(),
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
  const bindNodeTargetBoundary = (target: IRNodeTarget, reference: PositionReferenceView) =>
    'position' in reference.geometry
      ? undefined
      : bindTargetBoundary(reference.geometry, target, resolveExplicitBoundary, reference.irPath);

  const evaluateNodeTargetPoint = (
    target: IRNodeTarget,
    reference: PositionReferenceView,
    canonicalBoundary: CanonicalNodeBoundary | undefined,
  ): IRPosition => {
    const geometry = reference.geometry;
    if ('position' in geometry) {
      if (typeof target.anchor === 'string' && !isAnchor(target.anchor))
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Unknown anchor '${target.anchor}' for coordinate '${target.id}'`,
        );
      if (typeof target.anchor === 'object')
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          '{ side, fraction } is not meaningful on a zero-size target (coordinate)',
        );
      return geometry.position;
    }
    if (target.anchor === undefined) return [geometry.geometry.rect.x, geometry.geometry.rect.y];
    const state = boundaryStore.getOrCreateState(geometry.shape);
    return boundaryStore.getOrCreateAnchor(geometry, target.anchor, target.boundary, canonicalBoundary, {
      irPath: reference.irPath ?? state.irPath,
    });
  };

  const evaluateBetweenWorld = (between: IRBetweenPosition): IRPosition | null =>
    evaluatePositionTarget(between, context).referencePoint;

  const context: PositionTargetEvaluateContext = {
    nodeDistance,
    lookupReference,
    toLocal,
    toWorld,
    bindNodeTargetBoundary,
    evaluateNodeTargetPoint,
    evaluateBetweenWorld,
  };

  return context;
};
