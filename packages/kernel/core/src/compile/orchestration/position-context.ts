import type { Transform } from '../../contract';
import type { BoundaryReferenceResolution, BoundaryReferenceResolver, NodeReferenceView } from '../../resolve';
import { boundaryKey } from '../../resolve';
import type { PositionReferenceView, PositionTargetResolveContext } from '../../resolve/position';
import { resolvePositionTarget } from '../../resolve/position';
import type { IRBetweenPosition, IRNodeTarget, IRPosition } from '../../schemas';
import type { NamespaceEntry } from '../namespace';
import { nodeReferenceViewOf } from '../node';
import type { NodeGeometryContext } from '../node';
import { resolveAnchorRef } from '../reference';
import type { EffectiveScopeTransform } from '../transform';
import { applyScopeTransform, inverseScopeTransform, composeScopeTransform } from '../transform';

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
  lookupReference: (id: string) => NamespaceEntry | undefined;
  /** 与节点布局及路径裁剪共享的几何消费状态 */
  geometryContext?: NodeGeometryContext;
  /** 相对定位默认距离 */
  nodeDistance: number;
  /** 当前 Scope 累积 transform */
  scopeChain?: ReadonlyArray<Transform>;
  /** traversal 已合成的当前 Scope 变换 */
  effectiveTransform?: EffectiveScopeTransform;
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
  const { nodeDistance, scopeChain = [], resolveExplicitBoundary } = input;

  const transform = input.effectiveTransform ?? composeScopeTransform(scopeChain);

  const lookupReference = (id: string): PositionReferenceView | undefined => {
    const entry = input.lookupReference(id);
    return entry === undefined
      ? undefined
      : { state: entry.state, node: nodeReferenceViewOf(entry.layout, input.geometryContext, id, entry.irPath) };
  };

  const toLocal = (world: IRPosition): IRPosition =>
    scopeChain.length === 0 ? [world[0], world[1]] : inverseScopeTransform(world, transform);
  const toWorld = (local: IRPosition): IRPosition =>
    scopeChain.length === 0 ? [local[0], local[1]] : applyScopeTransform(local, transform);
  const boundaryResolutionOf = (target: IRNodeTarget, reference: PositionReferenceView) =>
    targetBoundaryResolutionOf(reference.node, target, resolveExplicitBoundary);

  const pointOfNodeTarget = (
    target: IRNodeTarget,
    reference: PositionReferenceView,
    boundaryResolution: BoundaryReferenceResolution | undefined,
  ): IRPosition => {
    const node = reference.node;
    if (target.anchor === undefined) return [node.rect.x, node.rect.y];
    return resolveAnchorRef(
      node,
      target.anchor,
      target.boundary ?? node.boundary,
      boundaryResolution,
      input.geometryContext?.get(node),
    );
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
