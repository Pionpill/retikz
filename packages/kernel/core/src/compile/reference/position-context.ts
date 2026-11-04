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

/** 把视觉 shape 绑定为默认连接面 resolution */
const shapeBoundaryResolutionOf = (node: CompiledNodeLayout): BoundaryResolution => ({
  name: node.shape.name,
  definition: node.shape.definition,
  params: node.shape.params,
  isShape: true,
});

/** 绑定 NodeTarget 选择的连接面，不执行 layout geometry */
const targetBoundaryResolutionOf = (
  node: CompiledNodeLayout,
  target: IRNodeTarget,
  resolveExplicitBoundary?: NodeBoundaryResolver,
  irPath?: PropertyPath,
): BoundaryResolution | undefined => {
  const boundary = target.boundary ?? node.boundarySource;
  if (boundary === undefined || boundary === 'shape') return shapeBoundaryResolutionOf(node);
  if (boundaryKey(boundary) === boundaryKey(node.boundarySource)) return node.boundary;
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
  lookupReference: (id: string) =>
    | Readonly<{
        /** 引用的布局解析阶段 */
        state: PositionReferenceView['state'];
        /** 引用目标的几何布局 */
        layout: CompiledNodeLayout;
        /** 引用目标的来源路径 */
        irPath?: PropertyPath;
      }>
    | undefined;
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
 * @description 引用直接持有完整布局，标识与来源路径保存在引用记录上
 */
export const createPositionResolveContext = (input: InputPositionResolveContext): PositionTargetResolveContext => {
  const { nodeDistance, transformChain = [], resolveExplicitBoundary } = input;

  const transform = input.composedTransform ?? composeScopeTransform(transformChain);

  const lookupReference = (id: string): PositionReferenceView | undefined => {
    const entry = input.lookupReference(id);
    return entry === undefined
      ? undefined
      : {
          state: entry.state,
          node: entry.layout,
          id,
          irPath: entry.irPath,
        };
  };

  const toLocal = (world: IRPosition): IRPosition =>
    transformChain.length === 0 ? [world[0], world[1]] : inverseScopeTransform(world, transform);
  const toWorld = (local: IRPosition): IRPosition =>
    transformChain.length === 0 ? [local[0], local[1]] : applyScopeTransform(local, transform);
  const boundaryResolutionOf = (target: IRNodeTarget, reference: PositionReferenceView) =>
    targetBoundaryResolutionOf(reference.node, target, resolveExplicitBoundary, reference.irPath);

  const pointOfNodeTarget = (
    target: IRNodeTarget,
    reference: PositionReferenceView,
    boundaryResolution: BoundaryResolution | undefined,
  ): IRPosition => {
    const node = reference.node;
    if (target.anchor === undefined) return [node.geometry.rect.x, node.geometry.rect.y];
    const state = input.nodeBoundaryStore?.get(node);
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
