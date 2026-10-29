import type { CompositeInputScope } from '../../contract/composite';
import { resolveCompositeInputScope } from '../../contract/composite';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../resolve';
import type { IRScene } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompileOptions } from '../types';
import type { SharedCompileContext } from './shared';
import { createSharedCompileContext } from './shared';
import type { WorkspaceCompileContext } from './workspace';
import { createWorkspaceCompileContext } from './workspace';

/** 全量编译上下文，共享能力与单次计算状态分开持有 */
export type FullCompileContext = {
  /** 可跨次复用的配置、定义与宿主能力 */
  shared: SharedCompileContext;
  /** 本次计算的公共工作区 */
  workspace: WorkspaceCompileContext;
  /** 与当前输入树配对的 Composite 实例输入 */
  compositeInputs: CompositeInputScope;
  /** Scene 根有效主题 */
  theme: CanonicalTheme;
};

/** 基于共享能力创建独立的全量编译上下文 */
export const createFullCompileContext = (
  ir: IRScene,
  options: Omit<CompileOptions, 'onWarn'>,
  shared = createSharedCompileContext(options),
): FullCompileContext => ({
  shared,
  workspace: createWorkspaceCompileContext(shared),
  compositeInputs: resolveCompositeInputScope(ir, options.compositeInputs),
  theme: resolveTheme(DEFAULT_RESOLVED_THEME, ir.theme, 'scene.theme', shared.registries.themeRegistry),
});
