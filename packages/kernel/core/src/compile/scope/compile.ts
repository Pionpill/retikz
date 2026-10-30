import type { ElementCompileOptions, ElementCompileResult } from '../context';
import { resolveScopeContext, runElementCompilation } from '../context';
import type { CompiledNodeLayout } from '../node';
import type { InputScopeCompile } from './geometry';
import { createScopeGroup } from './group';
import { compileScopeGeometry, prepareScopeGeometry } from './state';
import type { CompiledScope, ScopeCompilationPreparation } from './types';

/** Scope 自身编译上下文，子布局由调用者按依赖就绪顺序提供 */
export type ScopeCompileContext = ElementCompileOptions;

/** 在子元素计算前解析 Scope 样式、放置目标和可提前确定的变换 */
export const prepareScopeCompilation = (
  input: InputScopeCompile,
  context: ScopeCompileContext,
): ElementCompileResult<ScopeCompilationPreparation> =>
  runElementCompilation(context, workspace => {
    const geometry = {
      positionContext: workspace.positionContext,
      onWarn: workspace.diagnostics.collect,
      irPath: context.irPath,
    };
    return Object.freeze({
      scope: resolveScopeContext(input, context.shared, context.context, context.irPath),
      ...prepareScopeGeometry(input, geometry),
    });
  });

/** 聚合已完成的局部子布局并生成 Scope 自身输出，不递归编译 children */
export const compileScope = (
  input: InputScopeCompile,
  preparation: ScopeCompilationPreparation,
  layouts: ReadonlyArray<CompiledNodeLayout>,
  context: ScopeCompileContext,
): ElementCompileResult<CompiledScope> =>
  runElementCompilation(context, workspace => {
    const { envelope, transforms } = compileScopeGeometry(input, preparation, layouts, context.shared, {
      positionContext: workspace.positionContext,
      onWarn: workspace.diagnostics.collect,
      irPath: context.irPath,
    });
    const group = createScopeGroup(input, transforms, context.shared, workspace, context.irPath);
    return Object.freeze({
      irPath: context.irPath,
      envelope,
      group: Object.freeze(group),
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives: [],
        resources: [...workspace.paintRegistry.resources(), ...workspace.clipRegistry.resources()],
        bounds: [],
      }),
    });
  });
