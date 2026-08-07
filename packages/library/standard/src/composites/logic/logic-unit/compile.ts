import type {
  CompositeCompileChild,
  IRChild,
  LayoutAxisProposal,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import { LayoutAxisProposalKind, LayoutChildProbeKind, LayoutIntrinsicMode } from '@retikz/core';

import type { LayoutArtifactContainer, LayoutArtifactItemBase, LayoutArtifactRect } from '../../layout/shared';
import type { LogicLayoutItemArtifact, LogicOuterArtifact } from '../shared';
import type {
  DecisionArtifact,
  IRDecision,
  IRJunction,
  IRStage,
  IRTerminal,
  JunctionArtifact,
  StageArtifact,
  TerminalArtifact,
} from './types';

import {
  alignAllocationInSlot,
  contentRectOf,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
  unionLayoutArtifactRects,
} from '../../layout/internal';
import { LayoutAlignment, LayoutOverflow } from '../../layout/shared';

type LogicUnitNode = IRTerminal | IRStage | IRDecision | IRJunction;
type LogicUnitArtifact = TerminalArtifact | StageArtifact | DecisionArtifact | JunctionArtifact;
type LogicUnitKind = LogicUnitNode['type'];
type LogicUnitNodeOf<TKind extends LogicUnitKind> = Extract<LogicUnitNode, { type: TKind }>;
type LogicUnitArtifactOf<TKind extends LogicUnitKind> = Extract<LogicUnitArtifact, { kind: TKind }>;

type Rect = LayoutArtifactRect;

export type LogicShellNode = Readonly<{
  id: string;
  content?: IRChild;
  appearance: LogicUnitNode['appearance'];
}>;

/** 单内容逻辑外壳的布局结果，供逻辑单元与 Callout 共同消费 */
export type LogicShellCompilation = Readonly<{
  allocation: Rect;
  contentBounds: Rect;
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
  if (shape === 'capsule') {
    return { type: 'rectangle', params: { cornerRadius: Math.min(width, height) / 2 } };
  }
  return shape;
};

/** 构造 Core Node 外壳，shape、boundary、style 与 identity 继续由 Core 负责 */
const shellNodeOf = (node: LogicShellNode, allocation: Rect): IRChild => ({
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
  const authoredContent = 'content' in node ? node.content : undefined;
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
    // content 裁剪时仍保留外壳可见区域
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
      : node.appearance.overflow === LayoutOverflow.Clip
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

const compileLogicUnit = <TKind extends LogicUnitKind>(
  node: LogicUnitNodeOf<TKind>,
  context: LayoutCompositeCompileContext,
  kind: TKind,
): LayoutCompositeCompileResult<LogicUnitArtifactOf<TKind>> => {
  const shell = compileLogicShell(node, context);
  const output = context.scope({ zIndex: node.appearance.zIndex }, [
    shell.shellChild,
    ...(shell.contentChild === undefined ? [] : [shell.contentChild]),
  ]);
  const artifactBase = {
    kind,
    id: node.id,
    outer: shell.outer,
    container: shell.container,
    content: shell.contentArtifact === undefined ? null : shell.contentArtifact,
    ...('role' in node && node.role === undefined ? {} : 'role' in node ? { role: node.role } : {}),
    ...('category' in node && node.category === undefined ? {} : 'category' in node ? { category: node.category } : {}),
  } as LogicUnitArtifactOf<TKind>;
  return {
    children: [output],
    allocationBounds: shell.allocation,
    artifact: Object.freeze(artifactBase) as LogicUnitArtifactOf<TKind>,
  };
};

const placeContent = (
  result: LayoutChildResult,
  contentBounds: Rect,
  allocation: Rect,
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
    overflow,
  });
};

const resolveLogicAxis = (
  axis: 'x' | 'y',
  policy: LogicUnitNode['appearance']['size']['x'],
  proposal: LayoutAxisProposal,
  minimumContribution: number,
  naturalContribution: number,
): number => {
  // 语义单元外壳复用 Standard layout container 的尺寸语义
  return resolveLayoutAxisSize({
    axis,
    policy,
    proposal,
    minimumContribution,
    naturalContribution,
  }).allocationSize;
};

export const compileTerminal = (
  node: IRTerminal,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<TerminalArtifact> => compileLogicUnit(node, context, 'terminal');

export const compileStage = (
  node: IRStage,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<StageArtifact> => compileLogicUnit(node, context, 'stage');

export const compileDecision = (
  node: IRDecision,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<DecisionArtifact> => compileLogicUnit(node, context, 'decision');

export const compileJunction = (
  node: IRJunction,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<JunctionArtifact> => compileLogicUnit(node, context, 'junction');
