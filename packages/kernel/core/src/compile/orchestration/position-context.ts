import type { Transform } from '../../contract';
import type { BoundaryReferenceResolution, BoundaryReferenceResolver, NodeReferenceView } from '../../resolve';
import type { PositionReferenceView, PositionTargetResolveContext } from '../../resolve/position';
import type { IRBetweenPosition, IRNodeTarget, IRPosition } from '../../schemas';
import type { NamespaceStack } from '../namespace';
import type { NodeLayout } from '../node';

import { boundaryKey } from '../../resolve';
import { resolvePositionTarget } from '../../resolve/position';
import { resolveAnchorRef } from '../reference';
import { applyTransformChain, inverseTransformChain } from '../transform';

/** 将已完成 layout 的节点投影为 resolver 可消费的纯引用视图 */
export const nodeReferenceViewOf = (node: NodeLayout): NodeReferenceView => ({
  id: node.id,
  shapeName: node.shapeName,
  shapeDef: node.shapeDef,
  shapeParams: { ...(node.shapeParams ?? {}) },
  rect: { ...node.rect },
  margin: { ...node.margin },
  boundary: node.boundary,
  boundaryResolution: node.boundaryResolution,
  irPath: node.irPath,
});

/** 把视觉 shape 绑定为默认连接面 resolution */
const shapeBoundaryResolutionOf = (node: NodeReferenceView): BoundaryReferenceResolution => ({
  name: node.shapeName,
  definition: node.shapeDef,
  params: node.shapeParams,
  isShape: true,
});

/** 绑定 NodeTarget 选择的连接面，不执行 layout geometry */
const targetBoundaryResolutionOf = (
  node: NodeReferenceView,
  target: IRNodeTarget,
  resolveExplicitBoundary?: BoundaryReferenceResolver,
): BoundaryReferenceResolution | undefined => {
  const boundary = target.boundary ?? node.boundary;
  if (boundary === undefined || boundary === 'shape') return shapeBoundaryResolutionOf(node);
  if (boundaryKey(boundary) === boundaryKey(node.boundary)) return node.boundaryResolution;
  if (resolveExplicitBoundary === undefined) return undefined;
  return resolveExplicitBoundary(boundary, {
    visualDef: node.shapeDef,
    visualParams: node.shapeParams,
    irPath: node.irPath,
  });
};

/** 创建 position resolver context 所需的 compile 状态投影 */
export type CreatePositionResolveContextInput = Readonly<{
  /** 当前命名空间 */
  namespaceStack: NamespaceStack;
  /** 相对定位默认距离 */
  nodeDistance: number;
  /** 当前 Scope 累积 transform */
  scopeChain?: ReadonlyArray<Transform>;
  /** 显式连接面绑定能力 */
  resolveExplicitBoundary?: BoundaryReferenceResolver;
}>;

/**
 * 从 compile 动态状态创建窄 Position/Target resolver context
 * @description NamespaceStack、NodeLayout 与 transform helper 不会越过该适配边界进入 resolve
 */
export const createPositionResolveContext = (
  input: CreatePositionResolveContextInput,
): PositionTargetResolveContext => {
  const { namespaceStack, nodeDistance, scopeChain = [], resolveExplicitBoundary } = input;
  const lookupReference = (id: string): PositionReferenceView | undefined => {
    const entry = namespaceStack.lookupEntry(id);
    return entry === undefined ? undefined : { state: entry.state, node: nodeReferenceViewOf(entry.layout) };
  };
  const toLocal = (world: IRPosition): IRPosition =>
    scopeChain.length === 0 ? [world[0], world[1]] : inverseTransformChain(world, scopeChain);
  const toWorld = (local: IRPosition): IRPosition =>
    scopeChain.length === 0 ? [local[0], local[1]] : applyTransformChain(local, scopeChain);
  const boundaryResolutionOf = (target: IRNodeTarget, reference: PositionReferenceView) =>
    targetBoundaryResolutionOf(reference.node, target, resolveExplicitBoundary);
  const pointOfNodeTarget = (
    target: IRNodeTarget,
    reference: PositionReferenceView,
    boundaryResolution: BoundaryReferenceResolution | undefined,
  ): IRPosition => {
    const node = reference.node;
    if (target.anchor === undefined) return [node.rect.x, node.rect.y];
    return resolveAnchorRef(node, target.anchor, target.boundary ?? node.boundary, boundaryResolution);
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
