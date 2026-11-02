import type { Transform } from '../../../contract';
import { resolveNodeBoundary } from '../../../resolve';
import type { PositionTargetResolveContext } from '../../../resolve/position';
import type { TreeCompileContext } from '../../context';
import { createPositionResolveContext } from './position-context';

/** 从树执行状态投影 resolver 所需的窄位置上下文 */
export const createTreePositionContext = (
  context: TreeCompileContext,
  scopeChain: ReadonlyArray<Transform>,
): PositionTargetResolveContext =>
  createPositionResolveContext({
    nodeBoundaryContext: context.workspace.nodeBoundaryContext,
    lookupReference: id => context.execution.namespaceStack.lookupReference(id),
    nodeDistance: context.shared.layout.nodeDistance,
    scopeChain,
    resolveExplicitBoundary: (boundary, referenceContext) =>
      resolveNodeBoundary(boundary, {
        visualDef: referenceContext.visualDef,
        visualParams: referenceContext.visualParams,
        shapeRegistry: context.shared.registries.shapeRegistry,
        boundaryRegistry: context.shared.registries.boundaryRegistry,
        irPath: referenceContext.irPath,
      }),
    composedTransform: context.execution.scopeTransformComposer.resolve(scopeChain),
  });
