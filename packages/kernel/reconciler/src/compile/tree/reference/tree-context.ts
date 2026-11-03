import type { PositionTargetResolveContext, Transform } from '@retikz/core';
import { createPositionResolveContext, resolveNodeBoundary } from '@retikz/core';

import type { CompileRuntime } from '../../runtime';

/** 从树执行状态投影 resolver 所需的窄位置上下文 */
export const createTreePositionContext = (
  runtime: CompileRuntime,
  scopeChain: ReadonlyArray<Transform>,
): PositionTargetResolveContext =>
  createPositionResolveContext({
    nodeBoundaryStore: runtime.state.workspace.nodeBoundaryStore,
    lookupReference: id => runtime.state.execution.namespaceStack.lookupReference(id),
    nodeDistance: runtime.context.layout.nodeDistance,
    transformChain: scopeChain,
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
