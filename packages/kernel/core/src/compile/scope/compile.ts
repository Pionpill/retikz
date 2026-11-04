import type { CompiledNodeLayout, SyntheticLayoutRegistryContext } from '../node';
import { createIntrinsicScopeLayout } from './layout';
import { calculateScopePlacementTransforms, lowerPreliminaryScopeTransforms } from './placement';
import { resolveScopePositionTarget } from './position';
import type { CompiledScope, InputScopeCompile, ScopeGeometryContext, ScopeGeometryPreparation } from './types';

/** 在子树执行前冻结 Scope 放置引用与不依赖包络的变换 */
export const prepareScopeGeometry = (input: InputScopeCompile, context: ScopeGeometryContext) => ({
  positionTarget: resolveScopePositionTarget(input, context),
  preliminaryTransforms: lowerPreliminaryScopeTransforms(input, context),
});

/** 根据局部子布局计算包络与最终变换，不递归子树或修改名称环境 */
export const compileScopeGeometry = (
  input: InputScopeCompile,
  preparation: ScopeGeometryPreparation,
  layouts: ReadonlyArray<CompiledNodeLayout>,
  registries: SyntheticLayoutRegistryContext,
  context: ScopeGeometryContext,
): CompiledScope => {
  const envelope = createIntrinsicScopeLayout(input, layouts, registries);
  const transforms = calculateScopePlacementTransforms(
    input,
    context,
    envelope,
    preparation.positionTarget,
    preparation.preliminaryTransforms,
  );
  return { envelope, transforms };
};
