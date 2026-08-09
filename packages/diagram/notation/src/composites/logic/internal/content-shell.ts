import type {
  CompositeCompileChild,
  IRChild,
  LayoutAxisProposal,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutProposal,
} from '@retikz/core';
import type { LayoutArtifactContainer, LayoutArtifactItemBase, LayoutArtifactRect } from '@retikz/layout';

import { BoundarySchema, ChildSchema, ShapeRefSchema } from '@retikz/core';
import { LayoutAxisProposalKind, LayoutChildProbeKind, LayoutIntrinsicMode } from '@retikz/core';
import { StrokeDashOffsetSchema, StrokeDashPatternSchema } from '@retikz/core';
import { LayoutAlignment, LayoutOverflow, LayoutOverflowSchema, LayoutSizeSchema } from '@retikz/layout';
import {
  alignAllocationInSlot,
  contentRectOf,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
  unionLayoutArtifactRects,
} from '@retikz/layout/compose';
import { z } from 'zod';

import type { LogicLayoutItemArtifact, LogicOuterArtifact } from '../shared';

import { LogicContentSizeDefault, LogicNeutralStyle, LogicNeutralStyleSchema, LogicSpacingSchema } from '../shared';

/** Content shell 的可复用外观输入，供 Callout 等需要包裹内容的 composite 使用 */
export const LogicContentShellAppearanceSchema = z
  .strictObject({
    size: LayoutSizeSchema.default(LogicContentSizeDefault),
    padding: LogicSpacingSchema.default(8),
    overflow: LayoutOverflowSchema.default('visible'),
    shape: z.union([z.string().min(1), ShapeRefSchema]).default({ type: 'rectangle', params: { cornerRadius: 8 } }),
    boundary: BoundarySchema.default('shape'),
    style: LogicNeutralStyleSchema.default(LogicNeutralStyle),
    dashPattern: StrokeDashPatternSchema.optional(),
    dashOffset: StrokeDashOffsetSchema.optional(),
    zIndex: z.number().int().default(0),
  })
  .describe('Content shell sizing, boundary, shape, and visual appearance.');

/** Content shell 的完整解析状态 */
export type LogicContentShellAppearance = z.infer<typeof LogicContentShellAppearanceSchema>;

/** 单内容外壳的布局输入 */
export type LogicShellNode = Readonly<{
  id: string;
  content?: IRChild;
  appearance: LogicContentShellAppearance;
}>;

/** 单内容逻辑外壳的布局结果，供 Callout 等 composite 继续消费 */
export type LogicShellCompilation = Readonly<{
  allocation: LayoutArtifactRect;
  contentBounds: LayoutArtifactRect;
  contentItem?: LayoutArtifactItemBase;
  contentArtifact?: LogicLayoutItemArtifact;
  container: LayoutArtifactContainer;
  shellItem: LayoutArtifactItemBase;
  outer: LogicOuterArtifact;
  shellChild: CompositeCompileChild;
  contentChild?: CompositeCompileChild;
}>;

const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
});

const exactProposal = (value: number): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Exact,
  value: Math.max(0, value),
});

const proposalOf = (x: LayoutAxisProposal, y: LayoutAxisProposal): LayoutProposal => ({ x, y });

const requiredProbe = (
  context: LayoutCompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const shellShapeOf = (shape: LogicShellNode['appearance']['shape'], width: number, height: number): unknown => {
  if (typeof shape === 'object') return shape;
  if (shape === 'capsule') return { type: 'rectangle', params: { cornerRadius: Math.min(width, height) / 2 } };
  return shape;
};

/** 构造 Core Node 外壳，布局和视觉语义继续由 Core 负责 */
const shellNodeOf = (node: LogicShellNode, allocation: LayoutArtifactRect): IRChild => ({
  type: 'node',
  id: node.id,
  position: [allocation.x + allocation.width / 2, allocation.y + allocation.height / 2],
  shape: shellShapeOf(node.appearance.shape, allocation.width, allocation.height) as never,
  boundary: node.appearance.boundary,
  minimumSize: { width: allocation.width, height: allocation.height },
  padding: 0,
  ...node.appearance.style,
  ...(node.appearance.dashPattern === undefined ? {} : { dashPattern: node.appearance.dashPattern }),
  ...(node.appearance.dashOffset === undefined ? {} : { dashOffset: node.appearance.dashOffset }),
});

const stripItemIdentity = (item: LayoutArtifactItemBase): LogicLayoutItemArtifact => {
  const artifact: Partial<LayoutArtifactItemBase> = { ...item };
  delete artifact.key;
  delete artifact.sourceIndex;
  return artifact as LogicLayoutItemArtifact;
};

/** 编译一个带单内容的逻辑外壳，返回可一次性 replay 的 opaque child */
export const compileLogicShell = (
  node: LogicShellNode,
  context: LayoutCompositeCompileContext,
): LogicShellCompilation => {
  const padding = normalizeLayoutSpacing(node.appearance.padding);
  const authoredContent = node.content;
  const minimum =
    authoredContent === undefined
      ? undefined
      : requiredProbe(context, authoredContent, proposalOf(intrinsicProposal('minimum'), intrinsicProposal('minimum')));
  const natural =
    authoredContent === undefined
      ? undefined
      : requiredProbe(context, authoredContent, proposalOf(intrinsicProposal('natural'), intrinsicProposal('natural')));
  const horizontalPadding = padding.left + padding.right;
  const verticalPadding = padding.top + padding.bottom;
  const allocation = Object.freeze({
    x: 0,
    y: 0,
    width: resolveLogicAxis(
      'x',
      node.appearance.size.x,
      context.proposal.x,
      (minimum?.slotSize.width ?? 0) + horizontalPadding,
      (natural?.slotSize.width ?? 0) + horizontalPadding,
    ),
    height: resolveLogicAxis(
      'y',
      node.appearance.size.y,
      context.proposal.y,
      (minimum?.slotSize.height ?? 0) + verticalPadding,
      (natural?.slotSize.height ?? 0) + verticalPadding,
    ),
  });
  const contentBounds = contentRectOf(allocation, padding);
  const finalContent =
    authoredContent === undefined
      ? undefined
      : requiredProbe(
          context,
          authoredContent,
          proposalOf(exactProposal(contentBounds.width), exactProposal(contentBounds.height)),
        );
  const contentItem =
    finalContent === undefined
      ? undefined
      : placeContent(finalContent, contentBounds, allocation, node.appearance.overflow);
  const container = createLayoutArtifactContainer(
    allocation,
    contentBounds,
    contentItem === undefined ? [] : [contentItem],
  );

  const shellProbe = requiredProbe(
    context,
    shellNodeOf(node, allocation),
    proposalOf(exactProposal(allocation.width), exactProposal(allocation.height)),
  );
  const shellItem = createLayoutArtifactItem({
    key: 'shell',
    sourceIndex: 0,
    margin: normalizeLayoutSpacing(0),
    slotBounds: allocation,
    result: shellProbe,
    translation: { x: 0, y: 0 },
    containerAllocation: allocation,
    overflow: LayoutOverflow.Visible,
  });
  const positiveRectOrNull = (rect: LayoutArtifactRect): LayoutArtifactRect | null =>
    rect.width > 0 && rect.height > 0 ? rect : null;
  const shellVisualBounds = positiveRectOrNull(shellItem.visualBounds);
  const containerVisualBounds = positiveRectOrNull(container.visualBounds);
  const outerVisualCandidates = [
    ...(shellVisualBounds === null ? [] : [shellVisualBounds]),
    ...(containerVisualBounds === null ? [] : [containerVisualBounds]),
  ];
  const outerVisualBounds =
    outerVisualCandidates.length === 0 ? unionLayoutArtifactRects([]) : unionLayoutArtifactRects(outerVisualCandidates);
  const shellVisible = shellItem.visibleBounds;
  const outerVisibleCandidates = [
    ...(shellVisible === null ? [] : [shellVisible]),
    ...(container.visibleBounds === null ? [] : [container.visibleBounds]),
  ];
  const outerVisibleBounds =
    outerVisibleCandidates.length === 0 ? null : unionLayoutArtifactRects(outerVisibleCandidates);
  const outer = Object.freeze({
    allocationBounds: allocation,
    shellVisualBounds,
    visualBounds: outerVisualBounds,
    visibleBounds: outerVisibleBounds,
  });
  const replayedShell = context.replay(shellProbe);
  const replayedContent =
    finalContent === undefined || contentItem === undefined
      ? undefined
      : context.replay(finalContent, { transforms: [{ kind: 'translate', ...contentItem.translation }] });
  const clippedContent =
    replayedContent === undefined
      ? undefined
      : node.appearance.overflow === 'clip'
        ? context.scope({ clip: layoutClipOf(allocation) }, [replayedContent])
        : replayedContent;
  return {
    allocation,
    contentBounds,
    ...(contentItem === undefined ? {} : { contentItem }),
    ...(contentItem === undefined ? {} : { contentArtifact: stripItemIdentity(contentItem) }),
    container,
    shellItem,
    outer,
    shellChild: replayedShell,
    ...(clippedContent === undefined ? {} : { contentChild: clippedContent }),
  };
};

const placeContent = (
  result: LayoutChildResult,
  contentBounds: LayoutArtifactRect,
  allocation: LayoutArtifactRect,
  overflow: LogicShellNode['appearance']['overflow'],
): LayoutArtifactItemBase => {
  const translation = Object.freeze({
    x: alignAllocationInSlot(contentBounds, result.allocationBounds, 'x', LayoutAlignment.Start),
    y: alignAllocationInSlot(contentBounds, result.allocationBounds, 'y', LayoutAlignment.Start),
  });
  return createLayoutArtifactItem({
    key: 'content',
    sourceIndex: 0,
    margin: normalizeLayoutSpacing(0),
    slotBounds: Object.freeze({
      x: contentBounds.x,
      y: contentBounds.y,
      width: result.slotSize.width,
      height: result.slotSize.height,
    }),
    result,
    translation,
    containerAllocation: allocation,
    overflow: overflow === 'clip' ? LayoutOverflow.Clip : LayoutOverflow.Visible,
  });
};

const resolveLogicAxis = (
  axis: 'x' | 'y',
  policy: NonNullable<LogicShellNode['appearance']['size']>[typeof axis] | undefined,
  proposal: LayoutAxisProposal,
  minimumContribution: number,
  naturalContribution: number,
): number =>
  resolveLayoutAxisSize({
    axis,
    policy: policy ?? { kind: 'content' },
    proposal,
    minimumContribution,
    naturalContribution,
  }).allocationSize;

export { ChildSchema };
