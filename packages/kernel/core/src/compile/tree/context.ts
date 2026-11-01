import type { CompileOccurrenceLocator, Transform } from '../../contract';
import { resolveNodeBoundary } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type { SharedCompileContext, WorkspaceCompileContext, FullCompileContext } from '../context';
import { createDuplicateWarning, withCompileWarningOccurrence } from '../diagnostics';
import type { CompileProvenanceTracker } from '../provenance';
import { createPositionResolveContext } from '../reference';
import type { CompileWarning } from '../warning';
import type { CompositeCompileSession } from './composite/session';
import { NamespaceStack } from './namespace';
import { ScopeTransformComposer } from './transform-cache';
import type { SubtreeCompileOptions } from './types';

/** 单次子树执行共享的依赖和操作；隔离 probe 创建独立上下文 */
export type CompileExecutionContext = {
  /** 跨执行共享的编译能力 */
  shared: SharedCompileContext;
  /** 当前执行独占的资源与诊断工作区 */
  workspace: WorkspaceCompileContext;
  /** 当前执行的名称注册与查找栈 */
  namespaceStack: NamespaceStack;
  /** 可选的编译来源收集器 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 顶层编译与隔离 probe 共享的组件会话 */
  compositeSession: CompositeCompileSession;
  /** 当前执行独占的变换组合缓存 */
  scopeTransformComposer: ScopeTransformComposer;
  /** 在执行期间绑定诊断来源，退出时恢复父来源 */
  withWarningOccurrence: WithCompileWarningOccurrence;
};

/** 在同步计算或延迟输出期间绑定诊断来源，退出时恢复父来源 */
export type WithCompileWarningOccurrence = <T>(occurrence: CompileOccurrenceLocator, execute: () => T) => T;

/** 从当前执行状态投影 resolver 所需的窄位置上下文 */
export const createTreePositionContext = (
  context: CompileExecutionContext,
  scopeChain: ReadonlyArray<Transform>,
): PositionTargetResolveContext => {
  return createPositionResolveContext({
    nodeBoundaryContext: context.workspace.nodeBoundaryContext,
    lookupReference: id => context.namespaceStack.lookupReference(id),
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
    composedTransform: context.scopeTransformComposer.resolve(scopeChain),
  });
};

/** 为一次树执行创建诊断来源栈，退出子项时恢复父来源 */
const createTreeWarningScope = (
  diagnostics: FullCompileContext['workspace']['diagnostics'],
  observeWarningOccurrence: SubtreeCompileOptions['observeWarningOccurrence'],
) => {
  const warningOccurrences: Array<CompileOccurrenceLocator> = [];
  const dispatchWarning = (warning: CompileWarning): void => {
    diagnostics.collect(withCompileWarningOccurrence(warning, warningOccurrences.at(-1)));
  };
  const withWarningOccurrence: WithCompileWarningOccurrence = (occurrence, execute) => {
    warningOccurrences.push(occurrence);
    observeWarningOccurrence?.(occurrence);
    try {
      return execute();
    } finally {
      warningOccurrences.pop();
      observeWarningOccurrence?.(warningOccurrences.at(-1));
    }
  };
  return { dispatchWarning, withWarningOccurrence };
};

/** 为子树执行建立独立的名称、诊断和变换环境 */
export const createTreeExecutionContext = (
  context: FullCompileContext,
  compositeSession: CompositeCompileSession,
  options: SubtreeCompileOptions,
): CompileExecutionContext => {
  const { namespaceStack, provenanceTracker, observeWarningOccurrence } = options;
  const { dispatchWarning, withWarningOccurrence } = createTreeWarningScope(
    context.workspace.diagnostics,
    observeWarningOccurrence,
  );
  const executionContext: CompileExecutionContext = {
    shared: context.shared,
    workspace: {
      ...context.workspace,
      diagnostics: { ...context.workspace.diagnostics, collect: dispatchWarning },
    },
    compositeSession,
    namespaceStack:
      namespaceStack ??
      new NamespaceStack({
        rootIdentity: provenanceTracker?.rootNamespace,
        onDuplicate: info => dispatchWarning(createDuplicateWarning(info)),
      }),
    provenanceTracker,
    scopeTransformComposer: new ScopeTransformComposer(),
    withWarningOccurrence,
  };

  return executionContext;
};
