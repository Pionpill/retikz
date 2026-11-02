import type { CompileOccurrenceLocator, CompositeInputScope } from '../../contract';
import { resolveCompositeInputScope } from '../../contract';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../resolve';
import type { IRScene } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import { CompileProvenanceTracker } from '../provenance';
import { createDuplicateWarning, withCompileWarningOccurrence } from '../shared';
import type { CompileWarning } from '../shared';
import type { CompileOptions, ExecuteOptions } from '../types';
import { CompositeCompileSession } from './composite';
import { NamespaceStack } from './namespace';
import { createSharedCompileContext } from './shared';
import type { SharedCompileContext } from './shared';
import { ScopeTransformComposer } from './transform';
import { createWorkspaceCompileContext } from './workspace';
import type { WorkspaceCompileContext } from './workspace';

/** 根编译与隔离子树共用的上下文结构 */
export type TreeCompileContext = {
  /** 可跨编译复用的配置、定义与宿主服务 */
  shared: SharedCompileContext;
  /** 当前计算独占的资源、诊断与几何工作区，与元素编译共用同一契约 */
  workspace: WorkspaceCompileContext;
  /** 根编译及其试编译共享的组件句柄和测量缓存 */
  session: CompositeCompileSession;
  /** 树执行专有的递归状态，试编译独立创建 */
  tree: {
    /** 当前执行的名称注册与查找栈 */
    namespaceStack: NamespaceStack;
    /** 当前执行的可选来源记录 */
    provenanceTracker?: CompileProvenanceTracker;
    /** 当前执行的变换组合缓存 */
    scopeTransformComposer: ScopeTransformComposer;
    /** 执行回调时绑定诊断来源，退出时恢复父来源 */
    withWarningOccurrence: <T>(occurrence: CompileOccurrenceLocator, execute: () => T) => T;
  };
  /** 子树入口初始环境，递归继承值由 frame 持有 */
  initial: {
    /** 当前输入树的组件实例输入 */
    compositeInputs: CompositeInputScope;
    /** 当前输入树的初始有效主题 */
    theme: CanonicalTheme;
  };
  /** 最终 Scene 自动视口留白，不参与子树测量 */
  padding?: CompileOptions['padding'];
};

/** 树执行环境的来源与名称隔离配置 */
export type InputTreeCompileEnvironment = {
  /** 试编译已 fork 的名称环境；根执行省略时创建 */
  namespaceStack?: NamespaceStack;
  /** 当前执行的来源记录 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 观察来源切换，供试编译捕获名称注册的来源 */
  observeWarningOccurrence?: (occurrence: CompileOccurrenceLocator | undefined) => void;
};

/** 创建树状态并为工作区诊断绑定来源，不修改传入的基础工作区 */
export const createTreeCompileEnvironment = (
  workspace: WorkspaceCompileContext,
  options: InputTreeCompileEnvironment = {},
): Pick<TreeCompileContext, 'workspace' | 'tree'> => {
  const { namespaceStack, provenanceTracker, observeWarningOccurrence } = options;
  const warningOccurrences: Array<CompileOccurrenceLocator> = [];
  const collect = (warning: CompileWarning): void => {
    workspace.diagnostics.collect(withCompileWarningOccurrence(warning, warningOccurrences.at(-1)));
  };
  const withWarningOccurrence: TreeCompileContext['tree']['withWarningOccurrence'] = (occurrence, execute) => {
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
    workspace: { ...workspace, diagnostics: { ...workspace.diagnostics, collect } },
    tree: {
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

/** 创建根树执行上下文，每次调用建立独立工作区与组件会话 */
export const createTreeCompileContext = (
  ir: IRScene,
  options: Omit<CompileOptions, 'onWarn'>,
  executeOptions: ExecuteOptions = {},
  shared = createSharedCompileContext(options),
): TreeCompileContext => ({
  shared,
  session: new CompositeCompileSession(),
  ...createTreeCompileEnvironment(createWorkspaceCompileContext(shared), {
    provenanceTracker: executeOptions.captureProvenance === true ? new CompileProvenanceTracker() : undefined,
  }),
  initial: {
    compositeInputs: resolveCompositeInputScope(ir, options.compositeInputs),
    theme: resolveTheme(DEFAULT_RESOLVED_THEME, ir.theme, 'scene.theme', shared.registries.themeRegistry),
  },
  padding: options.padding,
});
