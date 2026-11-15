import type {
  PositionTargetEvaluateContext,
  Transform,
  PathTargetQuery,
  PathTargetQueryResult,
  IRPosition,
  IRTarget,
} from '@retikz/core';
import {
  createPositionEvaluateContext,
  resolveNodeBoundary,
  createPathTargetResolver,
  bindPathTargets,
  resolvePath,
  RetikzCoreError,
  RetikzCoreErrorCode,
  isFatalProbeError,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { encodePropertyPath } from '@retikz/foundation';

import type { CompileRuntime, NamespaceStack } from '../../runtime';

/** 从树执行状态投影 resolver 所需的窄位置上下文，不在查询闭包中保留完整运行时 */
export const createTreePositionContext = (
  runtime: CompileRuntime,
  scopeChain: ReadonlyArray<Transform>,
  namespace: NamespaceStack = runtime.state.execution.namespaceStack,
): PositionTargetEvaluateContext => {
  const { boundaryStore } = runtime.state.workspace;
  const { shapeRegistry, boundaryRegistry } = runtime.context.registries;
  const { nodeDistance } = runtime.context.layout;
  const composedTransform = runtime.state.execution.scopeTransformComposer.resolve(scopeChain);
  return createPositionEvaluateContext({
    boundaryStore,
    lookupReference: (id, kind) => namespace.lookupReference(id, kind),
    nodeDistance,
    transformChain: scopeChain,
    resolveExplicitBoundary: (boundary, referenceContext) =>
      resolveNodeBoundary(boundary, {
        visualDef: referenceContext.visualDef,
        visualParams: referenceContext.visualParams,
        shapeRegistry,
        boundaryRegistry,
        irPath: referenceContext.irPath,
      }),
    composedTransform,
  });
};

/** 从已布局的位置环境读取有序目标，复用普通 Path 的解析与绑定阶段 */
export const createLayoutTargetResolver =
  (
    positionContext: PositionTargetEvaluateContext,
    pathContext: Parameters<typeof resolvePath>[1],
    scopeChain: ReadonlyArray<Transform>,
  ): ((query: PathTargetQuery) => PathTargetQueryResult) =>
  query => {
    // 绑定缓存和相对游标均限于本次查询，不回写布局结果
    const resolver = createPathTargetResolver(() => positionContext);
    const bindTarget = (target: IRTarget) => {
      try {
        return resolver.bindTarget!(target, scopeChain);
      } catch (cause) {
        if (isFatalProbeError(cause)) throw cause;
        const field = target === query.source ? 'source' : `points[${query.points.indexOf(target)}]`;
        throw new RetikzCoreError({
          code: RetikzCoreErrorCode.Compile,
          message: `Path target query could not resolve ${field}.`,
          details: { path: field },
          cause,
        });
      }
    };
    const resolved = bindPathTargets(
      resolvePath(
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: query.source },
            { type: 'step', kind: 'smooth', points: [...query.points] },
          ],
        },
        pathContext,
      ),
      {
        scopeChain,
        targetResolver: { bindTarget, pointOfTarget: target => bindTarget(target)?.point ?? null },
      },
    );

    const pointAt = (locator: PropertyPath, field: string): IRPosition => {
      const point = resolved.targets.get(encodePropertyPath(locator))?.point;
      if (point === undefined || point === null || !point.every(Number.isFinite))
        throw new RetikzCoreError({
          code: RetikzCoreErrorCode.Compile,
          message: `Path target query could not resolve ${field}.`,
          details: { path: field },
        });
      return [point[0], point[1]];
    };
    return {
      source: pointAt([...resolved.irPath, 'children', 0, 'to'], 'source'),
      points: query.points.map((_point, index) =>
        pointAt([...resolved.irPath, 'children', 1, 'points', index], `points[${index}]`),
      ),
    };
  };
