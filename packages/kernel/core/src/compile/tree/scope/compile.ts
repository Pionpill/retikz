import type { CompiledNodeLayout } from '../../layout';
import type { SharedCompileContext, ElementCompileOptions, ElementCompileResult } from '../../runtime';
import { runElementCompilation } from '../element';
import { resolveScopeStyle } from './context';
import { createScopeGroup } from './emit';
import { createIntrinsicScopeLayout } from './layout';
import {
  resolveFinalScopeTransforms,
  resolvePreliminaryScopeTransforms,
  resolveScopePositionTarget,
} from './placement';
import type { CompiledScope, InputScopeCompile, ScopeCompilationPreparation, ScopeGeometryContext } from './types';

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
      onWarn: workspace.diagnosticCollector.collect,
      irPath: context.irPath,
    };
    return Object.freeze({
      scope: resolveScopeStyle(input, context.shared, context.style, context.irPath),
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
      onWarn: workspace.diagnosticCollector.collect,
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
        resources: [...workspace.paintRegistry.getResources(), ...workspace.clipRegistry.getResources()],
        bounds: [],
      }),
    });
  });

/** 在子树执行前冻结 Scope 放置引用与不依赖包络的变换 */
export const prepareScopeGeometry = (input: InputScopeCompile, context: ScopeGeometryContext) => ({
  positionTarget: resolveScopePositionTarget(input, context),
  preliminaryTransforms: resolvePreliminaryScopeTransforms(input, context),
});

/** 根据局部子布局计算包络与最终变换，不递归子树或修改名称环境 */
export const compileScopeGeometry = (
  input: InputScopeCompile,
  preparation: Pick<ScopeCompilationPreparation, 'positionTarget' | 'preliminaryTransforms'>,
  layouts: ReadonlyArray<CompiledNodeLayout>,
  shared: SharedCompileContext,
  context: ScopeGeometryContext,
) => {
  const envelope = createIntrinsicScopeLayout(input, layouts, shared.registries);
  const transforms = resolveFinalScopeTransforms(
    input,
    context,
    envelope,
    preparation.positionTarget,
    preparation.preliminaryTransforms,
  );
  return { envelope, transforms };
};
