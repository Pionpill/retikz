import type { LayoutCompositeCompileContext } from '@retikz/core';
import type { BoundsInsets, BoundsRect } from '@retikz/math';

import { intrinsicLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { CanonicalGroup } from '../../resolve';
import type { IRGroup } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { resolveGroup } from '../../resolve';
import { lowerGroupCaptionComposition, lowerGroupSurface } from './lower';

/** Group shell 对自动布局公开的最小尺寸与 body content insets */
export type GroupShellMetrics = Readonly<{
  minimumSize: Readonly<Pick<BoundsRect, 'width' | 'height'>>;
  contentInsets: Readonly<BoundsInsets>;
}>;

/** Graph Group compile 与跨包测量共享的 shell 组合结果 */
export const composeGroupShell = (
  group: CanonicalGroup,
  context: LayoutCompositeCompileContext,
): Readonly<{ surface: ReturnType<typeof lowerGroupSurface>; metrics: GroupShellMetrics }> => {
  const surface = lowerGroupSurface(group);
  const caption = lowerGroupCaptionComposition(group.source);
  const captionSize =
    caption === undefined
      ? { width: 0, height: 0 }
      : requiredLayoutProbe(context, { child: caption.child, occurrence: 0 }, intrinsicLayoutProposal('natural'))
          .slotSize;
  const captionHeightWithGap = caption === undefined ? 0 : captionSize.height + caption.bodyGap;
  const contentInsets = {
    top: surface.padding.top + (caption?.side === 'top' ? captionHeightWithGap : 0),
    right: surface.padding.right,
    bottom: surface.padding.bottom + (caption?.side === 'bottom' ? captionHeightWithGap : 0),
    left: surface.padding.left,
  };
  return {
    surface,
    metrics: {
      minimumSize: {
        width: captionSize.width + surface.padding.left + surface.padding.right,
        height: captionHeightWithGap + surface.padding.top + surface.padding.bottom,
      },
      contentInsets,
    },
  };
};

/** 使用已解析 Graph registries 测量 Group shell */
export const measureResolvedGroupShell = (
  source: IRGroup,
  context: LayoutCompositeCompileContext,
  options: ResolvedGraphDefinitionOptions,
): GroupShellMetrics => composeGroupShell(resolveGroup(source, options, context.theme), context).metrics;

/** 使用 Group 自身 caption、padding 与 Surface 真源测量 shell */
export const measureGroupShell = (
  source: IRGroup,
  context: LayoutCompositeCompileContext,
  options: GraphDefinitionOptions = {},
): GroupShellMetrics => measureResolvedGroupShell(source, context, resolveGraphDefinitionOptions(options));

export { createGroupBodyAllocation } from './allocation';
