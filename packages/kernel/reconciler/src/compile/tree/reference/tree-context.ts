import type { PositionTargetEvaluateContext, Transform } from '@retikz/core';
import { createPositionEvaluateContext, resolveNodeBoundary } from '@retikz/core';

import type { CompileRuntime } from '../../runtime';

/** 从树执行状态投影 resolver 所需的窄位置上下文 */
export const createTreePositionContext = (
  runtime: CompileRuntime,
  scopeChain: ReadonlyArray<Transform>,
): PositionTargetEvaluateContext =>
  createPositionEvaluateContext({
    nodeBoundaryStore: runtime.state.workspace.nodeBoundaryStore,
    lookupReference: (id, kind) => runtime.state.execution.namespaceStack.lookupReference(id, kind),
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
