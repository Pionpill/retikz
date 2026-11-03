import type { PropertyPath } from '@retikz/foundation';
import { encodePropertyPath } from '@retikz/foundation';

import type { CompositeCompileContext, Transform } from '../../../contract';
import { naturalLayoutProposal } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import { resolveNodeBoundary, resolvePath as resolvePathValue } from '../../../resolve';
import { isFatalProbeError } from '../../../resolve/diagnostics';
import type { IRPosition, IRTarget } from '../../../schemas';
import type { NamespaceStack } from '../../runtime';
import { bindPathTarget } from '../path';
import { createPositionResolveContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { snapshotCompositeLayoutChild } from './handle';
import type { CompositeProbeSequence } from './measurement';
import type { CompositeProbeContext } from './probe';
import { probeCompositeLayout } from './probe';

/** 创建回调级路径目标查询服务，派生主题共享环境缓存，结束回调时显式清理 */
export const createCompositeTargetQuery = (
  probeContext: CompositeProbeContext,
  frame: SubtreeCompileRuntime,
  probeSequence: CompositeProbeSequence,
) => {
  const { runtime, owner, occurrence } = probeContext;
  // 回调内只保留查询事实，不持有可消费的 replay 或目标解析游标
  const queryEnvironments = new Map<
    string,
    Readonly<{ namespaceStack: NamespaceStack; scopeChain: ReadonlyArray<Transform> }>
  >();
  let queryNamespaceIdentity = runtime.state.execution.namespaceStack.measurementIdentity;

  return {
    /** 在指定主题下查询目标点，缓存不保存可消费的重放凭证 */
    resolve: (
      theme: SubtreeCompileRuntime['context']['style']['theme'],
      query: Parameters<CompositeCompileContext['resolvePathTargets']>[0],
    ): ReturnType<CompositeCompileContext['resolvePathTargets']> => {
      const queryChild = snapshotCompositeLayoutChild(owner.label, query.child, probeSequence.index++);
      const namespaceIdentity = runtime.state.execution.namespaceStack.measurementIdentity;
      if (queryNamespaceIdentity !== namespaceIdentity) {
        queryEnvironments.clear();
        queryNamespaceIdentity = namespaceIdentity;
      }
      // Definition、测量器、绑定所有者与递归预算在当前回调内固定；派生 theme 按值区分
      const queryKey = JSON.stringify([queryChild, theme, frame.context.style.defaults, frame.context.transformChains]);
      let shared = queryEnvironments.get(queryKey);
      if (shared === undefined) {
        let queryNamespace: NamespaceStack | undefined;
        let queryChain = frame.context.transformChains;
        const probe = probeCompositeLayout(
          probeContext,
          queryChild,
          naturalLayoutProposal,
          occurrence,
          frame.context.transformChains,
          frame.context.style.defaults,
          theme,
          false,
          undefined,
          (scope, namespace, chain) => {
            if (scope !== queryChild) return;
            queryNamespace = namespace.fork();
            // 查询者位于被测子项之外；保留真正的祖先，但不把子项自身视为查询者的祖先
            queryNamespace.leaveScope();
            queryChain = chain;
          },
        );
        shared = { namespaceStack: queryNamespace ?? probe.namespaceStack, scopeChain: queryChain };
        queryEnvironments.set(queryKey, shared);
        if (queryEnvironments.size > 64) queryEnvironments.delete(queryEnvironments.keys().next().value!);
      } else {
        queryEnvironments.delete(queryKey);
        queryEnvironments.set(queryKey, shared);
      }
      // fork 隔离 resolving phase 与引用解析状态，缓存快照始终只读
      const targetNamespace = shared.namespaceStack.fork();
      const queryChain = shared.scopeChain;
      const positionContext = createPositionResolveContext({
        nodeBoundaryStore: runtime.state.workspace.nodeBoundaryStore,
        lookupReference: id => targetNamespace.lookupReference(id),
        nodeDistance: runtime.context.layout.nodeDistance,
        transformChain: queryChain,
        resolveExplicitBoundary: (boundary, referenceContext) =>
          resolveNodeBoundary(boundary, {
            visualDef: referenceContext.visualDef,
            visualParams: referenceContext.visualParams,
            shapeRegistry: runtime.context.registries.shapeRegistry,
            boundaryRegistry: runtime.context.registries.boundaryRegistry,
            irPath: referenceContext.irPath,
          }),
      });
      targetNamespace.setPhase('resolving');

      try {
        const bindingOf = (target: IRTarget) => {
          try {
            return bindPathTarget(target, positionContext);
          } catch (cause) {
            if (isFatalProbeError(cause)) throw cause;
            const pointIndex = query.points.indexOf(target);
            const field = target === query.source ? 'source' : `points[${pointIndex}]`;
            throw new RetikzCoreError({
              code: RetikzCoreErrorCode.Compile,
              message: `Path target query could not resolve ${field}.`,
              details: { path: field },
              cause,
            });
          }
        };

        const queryResolution = resolvePathValue(
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: query.source },
              { type: 'step', kind: 'smooth', points: [...query.points] },
            ],
          },
          {
            mode: theme.mode,
            scopeChain: queryChain,
            targetResolver: {
              pointOfTarget: target => bindingOf(target)?.point ?? null,
              bindTarget: target => bindingOf(target),
            },
            pathRegistry: runtime.context.registries.pathRegistry,
            arrowRegistry: runtime.context.registries.arrowRegistry,
            markRegistry: runtime.context.registries.markRegistry,
            patternRegistry: runtime.context.registries.patternRegistry,
            round: runtime.context.layout.round,
            irPath: ['query'],
          },
        );

        const pointAt = (locator: PropertyPath, field: string): IRPosition => {
          const point = queryResolution.targets.get(encodePropertyPath(locator))?.point;
          if (point === undefined || point === null || !point.every(Number.isFinite))
            throw new RetikzCoreError({
              code: RetikzCoreErrorCode.Compile,
              message: `Path target query could not resolve ${field}.`,
              details: { path: field },
            });

          return [point[0], point[1]];
        };

        return {
          source: pointAt(['query', 'children', 0, 'to'], 'source'),
          points: query.points.map((_point, pointIndex) =>
            pointAt(['query', 'children', 1, 'points', pointIndex], `points[${pointIndex}]`),
          ),
        };
      } finally {
        targetNamespace.setPhase('registering');
      }
    },
    /** 释放本次作者回调的查询环境 */
    clear: (): void => {
      queryEnvironments.clear();
    },
  };
};
