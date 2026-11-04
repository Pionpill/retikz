import type { CanonicalScope } from '../../resolve';
import { resolveAnimations } from '../../resolve';
import { createIntrinsicScopeLayout } from './layout';
import { shouldEmitScopeGroup } from './output';
import { calculateScopePlacementTransforms, lowerPreliminaryScopeTransforms } from './placement';
import { resolveScopePositionTarget } from './position';
import type { CompiledScope, InputScopeCompile, ScopeCompileContext, ScopeGeometryPreparation } from './types';

/** 调用方提前冻结的分组阶段结果 */
export type PreparedScopeCompilation = {
  /** 子树执行前求得的放置目标与初步变换 */
  placement?: ScopeGeometryPreparation;
};

/** 在子树执行前冻结 Scope 放置引用与不依赖包络的变换 */
export const prepareScopeGeometry = (
  input: InputScopeCompile,
  context: Pick<ScopeCompileContext, 'positionContext' | 'irPath' | 'onWarn'>,
) => ({
  positionTarget: resolveScopePositionTarget(input, context),
  preliminaryTransforms: lowerPreliminaryScopeTransforms(input, context),
});

/** 根据局部子布局计算包络与最终变换，不递归子树或修改名称环境 */
export const compileScope = (
  canon: CanonicalScope,
  context: ScopeCompileContext,
  prepared?: PreparedScopeCompilation,
): CompiledScope => {
  const { layouts, resolvedClipPath } = context;
  const preparation =
    prepared?.placement ?? prepareScopeGeometry({ type: 'scope', id: canon.style.id, ...canon.transform }, context);
  const envelope = createIntrinsicScopeLayout(canon, layouts);
  const transforms = calculateScopePlacementTransforms(
    { type: 'scope', ...canon.transform },
    context,
    envelope,
    preparation.positionTarget,
    preparation.preliminaryTransforms,
  );
  const clip =
    resolvedClipPath !== undefined
      ? context.registerClipPath(resolvedClipPath)
      : canon.clip === undefined
        ? undefined
        : context.registerClip(canon.clip);
  return { ...envelope, transforms, style: canon.style, clip, animations: [] };
};

/** 延迟路径输出收敛后绑定分组动画，裁空分组不产生动画诊断 */
export const finalizeScopeCompilation = (
  canon: CanonicalScope,
  compiled: CompiledScope,
  childCount: number,
  context: Pick<ScopeCompileContext, 'irPath' | 'onWarn'>,
): CompiledScope => {
  const animations = shouldEmitScopeGroup(
    childCount,
    compiled.transforms,
    compiled.style.id,
    compiled.clip !== undefined,
  )
    ? (resolveAnimations(canon.animations, { target: 'element', irPath: context.irPath, onWarn: context.onWarn }) ?? [])
    : [];
  return { ...compiled, animations };
};
