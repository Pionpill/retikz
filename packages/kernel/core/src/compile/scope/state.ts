import type { SharedCompileContext } from '../context';
import type { CompiledNodeLayout } from '../node';
import type { InputScopeCompile, ScopeGeometryContext } from './geometry';
import {
  createIntrinsicScopeLayout,
  resolveFinalScopeTransforms,
  resolvePreliminaryScopeTransforms,
  resolveScopePositionTarget,
} from './geometry';
import type { ScopeCompilationPreparation } from './types';

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
  const envelope = createIntrinsicScopeLayout(input, layouts, shared);
  const transforms = resolveFinalScopeTransforms(
    input,
    context,
    envelope,
    preparation.positionTarget,
    preparation.preliminaryTransforms,
  );
  return { envelope, transforms };
};
