import { jsonStructuralEquals } from '@retikz/foundation';

import type { SceneClipPath } from '../../contract';
import type { CanonicalScope } from '../../resolve';
import { resolveAnimations } from '../../resolve';
import type { ReferenceGeometryContext } from '../reference';
import type { ScopeEmitContext } from './emit';
import { createIntrinsicScopeLayout, createScopeGeometryContext } from './layout';
import { shouldEmitScopeGroup } from './output';
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
  input: CanonicalScope,
  preparation: ScopeGeometryPreparation,
  layouts: ReadonlyArray<ReferenceGeometryContext>,
  context: ScopeGeometryContext & ScopeEmitContext,
  resolvedClipPath?: SceneClipPath,
): CompiledScope => {
  const geometry = createIntrinsicScopeLayout(input, layouts);
  const envelope = createScopeGeometryContext(input, geometry);
  const transforms = calculateScopePlacementTransforms(
    { type: 'scope', ...input.transform },
    context,
    envelope,
    preparation.positionTarget,
    preparation.preliminaryTransforms,
  );
  const clip =
    resolvedClipPath !== undefined
      ? context.registerClipPath(resolvedClipPath)
      : input.clip === undefined
        ? undefined
        : context.registerClip(input.clip);
  return { geometry, transforms, style: input.style, clip, animations: [] };
};

/** 延迟路径输出收敛后绑定分组动画，裁空分组不产生动画诊断 */
export const finalizeScopeCompilation = (
  canon: CanonicalScope,
  compiled: CompiledScope,
  childCount: number,
  context: Pick<ScopeGeometryContext, 'irPath' | 'onWarn'>,
): CompiledScope => {
  const animations = shouldEmitScopeGroup(
    childCount,
    compiled.transforms,
    compiled.style.id,
    compiled.clip !== undefined,
  )
    ? (resolveAnimations(canon.animations, { target: 'element', irPath: context.irPath, onWarn: context.onWarn }) ?? [])
    : [];
  return jsonStructuralEquals(animations, compiled.animations) ? compiled : { ...compiled, animations };
};
