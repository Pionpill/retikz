import type { WithRequiredProperties } from '@retikz/foundation';

import type { CanonicalScope } from '../../resolve';
import { layoutScopeEnvelope } from './envelope';
import { lowerScopePlacementTransforms, prepareScopePlacement } from './placement';
import type {
  CompiledScope,
  CompiledScopeLayout,
  PreparedScopeCompilation,
  PreparedScopeEmit,
  PreparedScopeLayout,
  ScopeCompileContext,
} from './types';

/** 编排 Scope 自身布局与绘制，消费 prepared 并补算缺项，不递归子树 */
export const compileScope = (
  canon: CanonicalScope,
  context: ScopeCompileContext,
  prepared?: PreparedScopeCompilation,
): CompiledScope => {
  const layout = layoutScope(canon, context, prepared?.layout);
  const emit = emitScope(canon, layout.overall, context, prepared?.emit);
  return {
    shape: canon.envelope.shape,
    boundary: { ...canon.envelope.shape, isShape: true },
    layout,
    emit,
    zIndex: canon.style.zIndex,
  };
};

/** 消费调用方确认有效的布局产物，补算包络和放置 */
const layoutScope = (
  canon: CanonicalScope,
  context: Pick<ScopeCompileContext, 'layouts' | 'positionContext' | 'irPath' | 'onWarn'>,
  prepared?: PreparedScopeLayout,
): WithRequiredProperties<PreparedScopeLayout, 'overall'> => {
  if (prepared?.overall !== undefined) return { ...prepared, overall: prepared.overall };
  const preparation =
    prepared?.preparation ??
    (prepared?.placement === undefined
      ? prepareScopePlacement({ type: 'scope', id: canon.style.id, ...canon.transform }, context)
      : undefined);
  const envelope = prepared?.envelope ?? layoutScopeEnvelope(canon, context.layouts);
  const placement =
    prepared?.placement ??
    lowerScopePlacementTransforms(
      { type: 'scope', ...canon.transform },
      context,
      { shape: canon.envelope.shape, boundary: { ...canon.envelope.shape, isShape: true }, geometry: envelope },
      preparation?.positionTarget,
      preparation?.preliminaryTransforms,
    );
  return { preparation, envelope, placement, overall: { geometry: envelope, transforms: placement } };
};

/** 复用已准备的裁剪与分组属性，不保存或处理子树 */
const emitScope = (
  canon: CanonicalScope,
  layout: CompiledScopeLayout,
  context: Pick<ScopeCompileContext, 'resolvedClipPath' | 'registerClipPath' | 'registerClip' | 'animations'>,
  prepared?: PreparedScopeEmit,
): WithRequiredProperties<PreparedScopeEmit, 'overall'> => {
  if (prepared?.overall !== undefined) return { ...prepared, overall: prepared.overall };
  const clip = prepared?.clip ?? {
    clipRef:
      context.resolvedClipPath !== undefined
        ? context.registerClipPath(context.resolvedClipPath)
        : canon.clip === undefined
          ? undefined
          : context.registerClip(canon.clip),
  };
  const { style } = canon;
  const { transforms } = layout;
  const animations = context.animations ?? [];
  return {
    clip,
    overall: {
      type: 'group',
      ...(style.id === undefined ? {} : { id: style.id }),
      ...(style.meta === undefined ? {} : { meta: style.meta }),
      ...(transforms.length === 0 ? {} : { transforms }),
      ...(clip.clipRef === undefined ? {} : { clipRef: clip.clipRef }),
      ...(animations.length === 0 ? {} : { animations }),
    },
  };
};
