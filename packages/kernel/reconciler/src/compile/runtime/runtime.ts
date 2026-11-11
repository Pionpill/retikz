import { DEFAULT_RESOLVED_THEME, resolveCompositeInputScope, resolveTheme } from '@retikz/core';
import type { IRScene } from '@retikz/core';

import { CompileProvenanceTracker } from '../provenance';
import type { CompileOptions, ExecuteOptions } from '../types';
import type { CompileStageCache } from './cache';
import { createSharedCompileContext } from './context';
import type { CompileContext } from './context';
import { CompositeCompileState, createCompileEnvironment, createWorkspaceCompileState } from './state';
import type { CompileState } from './state';
import { createCachedTextMeasurer } from './text-cache';

/** 一次树编译的稳定环境与可变执行状态 */
export type CompileRuntime = Readonly<{
  /** 编译期间不修改的输入环境 */
  context: CompileContext;
  /** 当前候选可选的跨次阶段缓存 */
  cache?: CompileStageCache;
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
    host: { ...shared.host, measureText: createCachedTextMeasurer(shared.host.measureText) },
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
