import type { CanonicalScope } from '../../resolve';
import { createIntrinsicScopeLayout } from './layout';
import { lowerScopePlacementTransforms, prepareScopePlacement } from './placement';
import type { CompiledScope, ScopeCompileContext, ScopePlacementPreparation } from './types';

/** 根据局部子布局计算包络与最终变换，不递归子树或修改名称环境 */
export const compileScope = (
  canon: CanonicalScope,
  context: ScopeCompileContext,
  prepared?: ScopePlacementPreparation,
): CompiledScope => {
  const { layouts, resolvedClipPath } = context;
  const preparation =
    prepared ?? prepareScopePlacement({ type: 'scope', id: canon.style.id, ...canon.transform }, context);
  const envelope = createIntrinsicScopeLayout(canon, layouts);
  const transforms = lowerScopePlacementTransforms(
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
