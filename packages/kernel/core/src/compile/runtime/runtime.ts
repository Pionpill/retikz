import { resolveCompositeInputScope } from '../../contract';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../resolve';
import type { IRScene } from '../../schemas';
import { CompileProvenanceTracker } from '../provenance';
import type { CompileOptions, ExecuteOptions } from '../types';
import { CompositeCompileState } from './composite';
import { createSharedCompileContext } from './context';
import type { CompileContext } from './context';
import { createCompileEnvironment } from './state';
import type { CompileState } from './state';
import { createWorkspaceCompileState } from './workspace';

/** 一次树编译的稳定环境与可变执行状态 */
export type CompileRuntime = Readonly<{
  /** 编译期间不修改的输入环境 */
  context: CompileContext;
  /** 当前编译拥有的状态 */
  state: CompileState;
}>;

/** 创建根树 Runtime，每次调用建立独立工作区与组件会话 */
export const createCompileRuntime = (
  ir: IRScene,
  options: Omit<CompileOptions, 'onWarn'>,
  executeOptions: ExecuteOptions = {},
  shared = createSharedCompileContext(options),
): CompileRuntime => ({
  context: {
    ...shared,
    compositeInputs: resolveCompositeInputScope(ir, options.compositeInputs),
    theme: resolveTheme(DEFAULT_RESOLVED_THEME, ir.theme, 'scene.theme', shared.registries.themeRegistry),
    padding: options.padding,
  },
  state: {
    composite: new CompositeCompileState(),
    ...createCompileEnvironment(createWorkspaceCompileState(shared), {
      provenanceTracker: executeOptions.captureProvenance === true ? new CompileProvenanceTracker() : undefined,
    }),
  },
});
