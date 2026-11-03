import type { Transform } from '../../../contract';
import { resolveNodeBoundary } from '../../../resolve';
import type { PositionTargetResolveContext } from '../../../resolve/position';
import type { CompileRuntime } from '../../runtime';
import { createPositionResolveContext } from './position-context';

/** 从树执行状态投影 resolver 所需的窄位置上下文 */
export const createTreePositionContext = (
  runtime: CompileRuntime,
  scopeChain: ReadonlyArray<Transform>,
): PositionTargetResolveContext =>
  createPositionResolveContext({
    nodeBoundaryStore: runtime.state.workspace.nodeBoundaryStore,
    lookupReference: id => runtime.state.execution.namespaceStack.lookupReference(id),
    nodeDistance: runtime.context.layout.nodeDistance,
    scopeChain,
    resolveExplicitBoundary: (boundary, referenceContext) =>
      resolveNodeBoundary(boundary, {
        visualDef: referenceContext.visualDef,
        visualParams: referenceContext.visualParams,
        shapeRegistry: runtime.context.registries.shapeRegistry,
        boundaryRegistry: runtime.context.registries.boundaryRegistry,
        irPath: referenceContext.irPath,
      }),
    composedTransform: runtime.state.execution.scopeTransformComposer.resolve(scopeChain),
  });
