import type { CompileOccurrenceLocator, CompileWarning } from '@retikz/core';

import type { CompileProvenanceTracker } from '../provenance';
import { createDuplicateWarning, withCompileWarningOccurrence } from '../shared';
import type { CompositeCompileState } from './composite';
import { NamespaceStack } from './namespace';
import { ScopeTransformComposer } from './transform';
import type { WorkspaceCompileState } from './workspace';

/** 单次树执行独占的名称、来源、变换与诊断绑定状态 */
type ExecutionCompileState = Readonly<{
  /** 当前执行的名称注册与查找栈 */
  namespaceStack: NamespaceStack;
  /** 当前执行的可选来源记录 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 当前执行的变换组合缓存 */
  scopeTransformComposer: ScopeTransformComposer;
  /** 执行回调时绑定诊断来源，退出时恢复父来源 */
  withWarningOccurrence: <T>(occurrence: CompileOccurrenceLocator, execute: () => T) => T;
}>;

/** 树编译持有的可变状态，按隔离与共享生命周期组织 */
export type CompileState = Readonly<{
  /** 当前计算独占的资源、诊断与几何工作区 */
  workspace: WorkspaceCompileState;
  /** 当前树执行独占的名称、来源和变换状态 */
  execution: ExecutionCompileState;
  /** 根编译及其试编译共享的组件状态 */
  composite: CompositeCompileState;
}>;

/** 树执行环境的来源与名称隔离配置 */
type CompileEnvironmentOptions = {
  /** 试编译已 fork 的名称环境；根执行省略时创建 */
  namespaceStack?: NamespaceStack;
  /** 当前执行的来源记录 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 观察来源切换，供试编译捕获名称注册的来源 */
  observeWarningOccurrence?: (occurrence: CompileOccurrenceLocator | undefined) => void;
};

/** 创建树状态并为工作区诊断绑定来源，不修改传入的基础工作区 */
export const createCompileEnvironment = (
  workspace: WorkspaceCompileState,
  options: CompileEnvironmentOptions = {},
): Pick<CompileState, 'workspace' | 'execution'> => {
  const { namespaceStack, provenanceTracker, observeWarningOccurrence } = options;
  const warningOccurrences: Array<CompileOccurrenceLocator> = [];
  const collect = (warning: CompileWarning): void => {
    workspace.diagnosticCollector.collect(withCompileWarningOccurrence(warning, warningOccurrences.at(-1)));
  };
  const withWarningOccurrence: ExecutionCompileState['withWarningOccurrence'] = (occurrence, execute) => {
    warningOccurrences.push(occurrence);
    observeWarningOccurrence?.(occurrence);
    try {
      return execute();
    } finally {
      warningOccurrences.pop();
      observeWarningOccurrence?.(warningOccurrences.at(-1));
    }
  };
  return {
    workspace: { ...workspace, diagnosticCollector: { ...workspace.diagnosticCollector, collect } },
    execution: {
      namespaceStack:
        namespaceStack ??
        new NamespaceStack({
          rootIdentity: provenanceTracker?.rootNamespace,
          onDuplicate: info => collect(createDuplicateWarning(info)),
        }),
      provenanceTracker,
      scopeTransformComposer: new ScopeTransformComposer(),
      withWarningOccurrence,
    },
  };
};
