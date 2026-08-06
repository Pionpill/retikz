import type {
  CompositeCompileScopeProps,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { LayoutAxisProposalKind } from '@retikz/core';

import type {
  LayoutChildHandle,
  LayoutRect,
  PairedFlowItem,
  PairedFlowPlan,
  PlacedLayoutChild,
} from '../../layout/internal';
import type { LayoutArtifactItemBase } from '../../layout/shared';
import type { MeasuredLegendChild, MeasuredLegendItem } from './providers';
import type {
  IRLegend,
  IRLegendItem,
  IRLegendItemsContent,
  LegendArtifact,
  LegendArtifactGeometry,
  LegendPlacedChildArtifact,
  LegendRampArtifact,
} from './types';

import {
  compensatedLayoutSum,
  contentRectOf,
  createLayoutArtifactContainer,
  intrinsicLayoutProposal,
  measureLayoutChild,
  normalizeLayoutSpacing,
  placeLayoutChild,
  replayLayoutChildren,
  requiredLayoutProbe,
  resolveFlexLineCrossMetrics,
  resolveFlexLineMainProfile,
  resolveLayoutAxisSize,
  resolvePairedFlowIntrinsicMainProfile,
  resolvePairedFlowPlan,
  translatePairedFlowPlan,
  unionLayoutArtifactRects,
} from '../../layout/internal';
import { LayoutAlignment, LayoutAxisSizeKind } from '../../layout/shared';
import { LegendContentKind, LegendDirection } from './constants';
import { pairedFlowItemsOf } from './providers';
import { createLegendRampStructure, translateLegendRampStructure } from './providers';

/** 把已度量 item 与最终 probe 所需 handle 组合 */
type CompileMeasuredItem = MeasuredLegendItem &
  Readonly<{
    sampleHandle: LayoutChildHandle;
    labelHandle?: LayoutChildHandle;
  }>;

/** 保存 child 最终放置与 Legend 专属 artifact 所需状态 */
type FinalPlacedChild = PlacedLayoutChild &
  Readonly<{
    /** 对外暴露的 Legend child placement artifact */
    artifact: LegendPlacedChildArtifact;
  }>;

/** 从 Legend 领域字段中分离 authored root Scope 的 Core 属性 */
const authoredScopePropsOf = (node: IRLegend): CompositeCompileScopeProps => {
  const {
    namespace: _namespace,
    type: _type,
    title,
    titleGap,
    contentAlign,
    size,
    padding,
    overflow,
    content,
    ...scopeProps
  } = node;
  void _namespace;
  void _type;
  void title;
  void titleGap;
  void contentAlign;
  void size;
  void padding;
  void overflow;
  void content;
  return scopeProps;
};

/** 计算指定物理轴两端 padding 的补偿求和 */
const paddingAxisSize = (
  padding: Readonly<{ top: number; right: number; bottom: number; left: number }>,
  axis: 'x' | 'y',
): number =>
  axis === 'x'
    ? compensatedLayoutSum([padding.left, padding.right])
    : compensatedLayoutSum([padding.top, padding.bottom]);

/** 取得 title 在指定物理轴的 minimum / natural contribution */
const titleAxisProfile = (
  title: MeasuredLegendChild | undefined,
  axis: 'x' | 'y',
): Readonly<{ minimum: number; natural: number }> => ({
  minimum: title === undefined ? 0 : axis === 'x' ? title.minimum.slotSize.width : title.minimum.slotSize.height,
  natural: title === undefined ? 0 : axis === 'x' ? title.natural.slotSize.width : title.natural.slotSize.height,
});

/** 把 title 或 body 的 intrinsic profile 映射成无 margin 的 Flex item */
const profileFlexItemOf = (
  key: string,
  sourceIndex: number,
  profile: Readonly<{ minimum: number; natural: number }>,
): Readonly<{
  key: string;
  sourceIndex: number;
  flexBaseSlot: number;
  min: number;
  grow: number;
  shrink: number;
  marginStart: number;
  marginEnd: number;
}> =>
  Object.freeze({
    key,
    sourceIndex,
    flexBaseSlot: profile.natural,
    min: profile.minimum,
    grow: 0,
    shrink: 0,
    marginStart: 0,
    marginEnd: 0,
  });

/** 使用共享 Flex cross metrics 读取两个结构块的最大 cross profile */
const flexCrossProfileOf = (
  first: Readonly<{ minimum: number; natural: number }>,
  second: Readonly<{ minimum: number; natural: number }>,
): Readonly<{ minimum: number; natural: number }> => ({
  minimum: resolveFlexLineCrossMetrics([
    { slotSize: first.minimum, marginStart: 0, marginEnd: 0, alignment: LayoutAlignment.Start },
    { slotSize: second.minimum, marginStart: 0, marginEnd: 0, alignment: LayoutAlignment.Start },
  ]).size,
  natural: resolveFlexLineCrossMetrics([
    { slotSize: first.natural, marginStart: 0, marginEnd: 0, alignment: LayoutAlignment.Start },
    { slotSize: second.natural, marginStart: 0, marginEnd: 0, alignment: LayoutAlignment.Start },
  ]).size,
});

/** 合并 title、body、gap 与 padding 为根容器轴向 profile */
const rootProfile = (
  title: Readonly<{ minimum: number; natural: number }>,
  body: Readonly<{ minimum: number; natural: number }>,
  paddingSize: number,
  titleGap: number,
  stackTitle: boolean,
): Readonly<{ minimum: number; natural: number }> => {
  const profileItems = [profileFlexItemOf('title', 0, title), profileFlexItemOf('body', 1, body)];
  const profile = stackTitle
    ? resolveFlexLineMainProfile(profileItems, [0, 1], titleGap)
    : flexCrossProfileOf(title, body);
  return Object.freeze({
    minimum: compensatedLayoutSum([paddingSize, profile.minimum]),
    natural: compensatedLayoutSum([paddingSize, profile.natural]),
  });
};

/** 通过共享 Box size policy 解析 Legend 单轴 allocation */
const resolveAxis = (
  node: IRLegend,
  context: LayoutCompositeCompileContext,
  axis: 'x' | 'y',
  profile: Readonly<{ minimum: number; natural: number }>,
): number =>
  resolveLayoutAxisSize({
    axis,
    policy: node.size[axis],
    proposal: context.proposal[axis],
    minimumContribution: profile.minimum,
    naturalContribution: profile.natural,
  }).allocationSize;

/** 从 Legend items 语义生成共享 paired flow 的纯 layout 输入 */
const pairedFlowOptionsOf = (content: IRLegendItemsContent, items: ReadonlyArray<PairedFlowItem>) => ({
  direction: content.direction,
  wrap: content.wrap,
  gap: content.gap,
  pairGap: content.sampleGap,
  primaryAlignment: content.sampleAlign,
  secondaryAlignment: content.sampleAlign,
  secondaryAlignmentBasis: 'pair' as const,
  items,
});

/** 读取 paired flow plan 在指定物理轴上的 minimum/natural profile */
const pairedFlowAxisProfileOf = (
  plan: PairedFlowPlan,
  direction: IRLegendItemsContent['direction'],
  axis: 'x' | 'y',
): Readonly<{ minimum: number; natural: number }> => {
  const mainAxis = direction === LegendDirection.Horizontal ? 'x' : 'y';
  return mainAxis === axis
    ? { minimum: plan.minimumMainSize, natural: plan.naturalMainSize }
    : { minimum: plan.minimumCrossSize, natural: plan.naturalCrossSize };
};

/** 调用共享 paired flow plan，并只在需要时提供最终内容预算 */
const pairedFlowPlanOf = (
  content: IRLegendItemsContent,
  items: ReadonlyArray<PairedFlowItem>,
  options: Readonly<{ availableMainSize?: number }> = {},
): PairedFlowPlan =>
  resolvePairedFlowPlan({
    ...pairedFlowOptionsOf(content, items),
    ...(options.availableMainSize === undefined ? {} : { availableMainSize: options.availableMainSize }),
  });

/** 在最终 content width 下取得 title 的 range / natural probe */
const finalTitleProbe = (
  context: LayoutCompositeCompileContext,
  handle: LayoutChildHandle | undefined,
  contentWidth: number,
): LayoutChildResult | undefined =>
  handle === undefined
    ? undefined
    : requiredLayoutProbe(context, handle, {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: contentWidth },
        y: intrinsicLayoutProposal('natural').y,
      });

/** 按 Legend content box 的物理 x 轴对齐结构块，不钳制负剩余空间 */
const alignedContentX = (
  contentBounds: LayoutRect,
  structuralWidth: number,
  alignment: IRLegend['contentAlign'],
): number => {
  if (alignment === LayoutAlignment.End) return contentBounds.x + contentBounds.width - structuralWidth;
  if (alignment === LayoutAlignment.Center) {
    return contentBounds.x + (contentBounds.width - structuralWidth) / 2;
  }
  return contentBounds.x;
};

/** 从共享布局 artifact 提取 Legend 对外 child placement */
const stripPlacedArtifact = (artifact: LayoutArtifactItemBase): LegendPlacedChildArtifact => {
  return Object.freeze({
    slotBounds: artifact.slotBounds,
    allocationBounds: artifact.allocationBounds,
    visualBounds: artifact.visualBounds,
    visibleBounds: artifact.visibleBounds,
    translation: artifact.translation,
    overflow: artifact.overflow,
  });
};

/** 完成 child exact probe、平移与可观察 placement artifact */
const placeFinalChild = (
  context: LayoutCompositeCompileContext,
  handle: LayoutChildHandle,
  slotBounds: LayoutRect,
  key: string,
  sourceIndex: number,
  containerAllocation: LayoutRect,
  overflow: IRLegend['overflow'],
  existingResult?: LayoutChildResult,
): FinalPlacedChild => {
  const placed = placeLayoutChild({
    context,
    handle,
    slotBounds,
    key,
    sourceIndex,
    containerAllocation,
    overflow,
    ...(existingResult === undefined ? {} : { existingResult }),
  });
  return Object.freeze({
    ...placed,
    artifact: stripPlacedArtifact(placed.baseArtifact),
  });
};

/** 汇总一组已放置 child 的 allocation、visual 与 visible 几何 */
const geometryOf = (children: ReadonlyArray<FinalPlacedChild>): LegendArtifactGeometry => {
  const allocationBounds = unionLayoutArtifactRects(children.map(child => child.artifact.allocationBounds));
  const visualBounds = unionLayoutArtifactRects(children.map(child => child.artifact.visualBounds));
  const visible = children.flatMap(child =>
    child.artifact.visibleBounds === null ? [] : [child.artifact.visibleBounds],
  );
  return Object.freeze({
    allocationBounds,
    visualBounds,
    visibleBounds: visible.length === 0 ? null : unionLayoutArtifactRects(visible),
  });
};

/** 编译 Standard Legend ramp form 的 normalization、placement、replay 与 typed artifact */
const compileLegendRamp = (
  node: IRLegend,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<LegendRampArtifact> => {
  if (node.content.kind !== LegendContentKind.Ramp) throw new Error('Expected Legend ramp content');
  const authoredScopeProps = authoredScopePropsOf(node);
  const ramp = node.content;
  let nextOccurrence = 0;
  const titleHandle =
    node.title === undefined ? undefined : Object.freeze({ child: node.title, occurrence: nextOccurrence++ });
  const sampleHandle = Object.freeze({ child: ramp.sample, occurrence: nextOccurrence++ });
  const tickHandles = ramp.ticks.map(tick => {
    const labelHandle =
      tick.label === undefined ? undefined : Object.freeze({ child: tick.label, occurrence: nextOccurrence++ });
    return Object.freeze({ ...(labelHandle === undefined ? {} : { labelHandle }) });
  });
  const titleMeasured = titleHandle === undefined ? undefined : measureLayoutChild(context, titleHandle);
  const sampleMeasured = measureLayoutChild(context, sampleHandle);
  const measuredTicks = ramp.ticks.map((tick, sourceIndex) => {
    const labelHandle = tickHandles[sourceIndex].labelHandle;
    return Object.freeze({
      key: tick.key,
      sourceIndex,
      offset: tick.offset,
      ...(labelHandle === undefined ? {} : { labelHandle, label: measureLayoutChild(context, labelHandle).natural }),
    });
  });
  const localStructure = createLegendRampStructure(ramp, sampleMeasured.natural, measuredTicks);
  const padding = normalizeLayoutSpacing(node.padding);
  const paddingX = paddingAxisSize(padding, 'x');
  const paddingY = paddingAxisSize(padding, 'y');
  const titleX = titleAxisProfile(titleMeasured, 'x');
  const bodyX = { minimum: localStructure.bounds.width, natural: localStructure.bounds.width };
  const allocationWidth = resolveAxis(node, context, 'x', rootProfile(titleX, bodyX, paddingX, 0, false));
  const contentWidth = Math.max(0, allocationWidth - paddingX);
  const titleResult = finalTitleProbe(context, titleHandle, contentWidth);
  const titleHeight = titleResult?.slotSize.height ?? 0;
  const effectiveTitleGap = titleResult === undefined ? 0 : node.titleGap;
  const bodyY = { minimum: localStructure.bounds.height, natural: localStructure.bounds.height };
  const allocationHeight = resolveAxis(
    node,
    context,
    'y',
    rootProfile({ minimum: titleHeight, natural: titleHeight }, bodyY, paddingY, effectiveTitleGap, true),
  );
  const allocation = Object.freeze({ x: 0, y: 0, width: allocationWidth, height: allocationHeight });
  const contentBounds = contentRectOf(allocation, padding);
  const structure = translateLegendRampStructure(localStructure, {
    x: alignedContentX(contentBounds, localStructure.bounds.width, node.contentAlign),
    y: contentBounds.y + titleHeight + effectiveTitleGap,
  });
  const sample = placeFinalChild(
    context,
    sampleHandle,
    structure.sampleSlot,
    'ramp-sample',
    0,
    allocation,
    node.overflow,
  );
  const finalTicks = structure.ticks.map(tick => {
    const measured = measuredTicks[tick.sourceIndex];
    const label =
      tick.labelSlot === null || measured.labelHandle === undefined
        ? null
        : placeFinalChild(
            context,
            measured.labelHandle,
            tick.labelSlot,
            `tick-label:${tick.key}`,
            tick.sourceIndex,
            allocation,
            node.overflow,
          );
    return Object.freeze({ tick, label });
  });
  const bodyChildren = [sample, ...finalTicks.flatMap(tick => (tick.label === null ? [] : [tick.label]))];
  const bodyBounds = unionLayoutArtifactRects(bodyChildren.map(child => child.artifact.allocationBounds));
  const titleSlot =
    titleResult === undefined
      ? undefined
      : Object.freeze({
          x: alignedContentX(contentBounds, titleResult.slotSize.width, node.contentAlign),
          y: contentBounds.y,
          width: titleResult.slotSize.width,
          height: titleResult.slotSize.height,
        });
  const title =
    titleHandle === undefined || titleResult === undefined || titleSlot === undefined
      ? null
      : placeFinalChild(context, titleHandle, titleSlot, 'title', 0, allocation, node.overflow, titleResult);
  const allPlaced = [
    ...(title === null ? [] : [title]),
    sample,
    ...finalTicks.flatMap(tick => (tick.label === null ? [] : [tick.label])),
  ];
  const allocationScope = replayLayoutChildren(context, allPlaced, allocation, node.overflow);
  const authoredRootScope = context.scope(authoredScopeProps, [allocationScope]);

  return {
    children: [authoredRootScope],
    allocationBounds: allocation,
    artifact: Object.freeze({
      kind: LegendContentKind.Ramp,
      container: createLayoutArtifactContainer(
        allocation,
        contentBounds,
        allPlaced.map(placed => placed.baseArtifact),
      ),
      title: title?.artifact ?? null,
      bodyBounds,
      sample: sample.artifact,
      ticks: finalTicks.map(({ tick, label }) =>
        Object.freeze({
          key: tick.key,
          sourceIndex: tick.sourceIndex,
          anchor: tick.anchor,
          label: label?.artifact ?? null,
        }),
      ),
    }),
  };
};

/** 编译 Standard Legend items form 的 probe、布局、placement、replay 与 typed artifact */
export const compileLegend = (
  node: IRLegend,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<LegendArtifact> => {
  if (node.content.kind === LegendContentKind.Ramp) return compileLegendRamp(node, context);
  const authoredScopeProps = authoredScopePropsOf(node);

  let nextOccurrence = 0;
  const titleHandle =
    node.title === undefined ? undefined : Object.freeze({ child: node.title, occurrence: nextOccurrence++ });
  const itemHandles = node.content.items.map(item => {
    const sampleHandle = Object.freeze({ child: item.sample, occurrence: nextOccurrence++ });
    const labelHandle =
      item.label === undefined ? undefined : Object.freeze({ child: item.label, occurrence: nextOccurrence++ });
    return Object.freeze({ sampleHandle, ...(labelHandle === undefined ? {} : { labelHandle }) });
  });
  const titleMeasured = titleHandle === undefined ? undefined : measureLayoutChild(context, titleHandle);
  const measured: Array<CompileMeasuredItem> = node.content.items.map((authored: IRLegendItem, sourceIndex) => {
    const handles = itemHandles[sourceIndex];
    return Object.freeze({
      authored,
      sourceIndex,
      sample: measureLayoutChild(context, handles.sampleHandle),
      ...(handles.labelHandle === undefined ? {} : { label: measureLayoutChild(context, handles.labelHandle) }),
      ...handles,
    });
  });
  const padding = normalizeLayoutSpacing(node.padding);
  const paddingX = paddingAxisSize(padding, 'x');
  const paddingY = paddingAxisSize(padding, 'y');
  const hasBody = measured.length > 0;
  const effectiveTitleGap = titleMeasured !== undefined && hasBody ? node.titleGap : 0;
  const titleX = titleAxisProfile(titleMeasured, 'x');
  const flowItems = pairedFlowItemsOf(measured);
  const flowOptions = pairedFlowOptionsOf(node.content, flowItems);
  const intrinsicMain = resolvePairedFlowIntrinsicMainProfile(flowOptions);
  const unwrappedPlan = resolvePairedFlowPlan({ ...flowOptions, wrap: 'nowrap' });
  const unwrappedCross = pairedFlowAxisProfileOf(
    unwrappedPlan,
    node.content.direction,
    node.content.direction === LegendDirection.Horizontal ? 'y' : 'x',
  );

  let allocationWidth: number;
  let allocationHeight: number;
  let flowPlan: PairedFlowPlan;
  let titleResult: LayoutChildResult | undefined;

  if (node.content.direction === LegendDirection.Horizontal) {
    const preliminaryX = rootProfile(titleX, intrinsicMain, paddingX, 0, false);
    allocationWidth = resolveAxis(node, context, 'x', preliminaryX);
    const preliminaryContentWidth = Math.max(0, allocationWidth - paddingX);
    flowPlan = pairedFlowPlanOf(node.content, flowItems, { availableMainSize: preliminaryContentWidth });
    if (node.size.x.kind === LayoutAxisSizeKind.Content && context.proposal.x.kind !== LayoutAxisProposalKind.Exact) {
      const formedMain = pairedFlowAxisProfileOf(flowPlan, node.content.direction, 'x');
      allocationWidth = resolveAxis(node, context, 'x', rootProfile(titleX, formedMain, paddingX, 0, false));
    }
    const contentWidth = Math.max(0, allocationWidth - paddingX);
    titleResult = finalTitleProbe(context, titleHandle, contentWidth);
    const finalTitleY = {
      minimum: titleResult?.slotSize.height ?? 0,
      natural: titleResult?.slotSize.height ?? 0,
    };
    const rowsCross = pairedFlowAxisProfileOf(flowPlan, node.content.direction, 'y');
    allocationHeight = resolveAxis(
      node,
      context,
      'y',
      rootProfile(finalTitleY, rowsCross, paddingY, effectiveTitleGap, true),
    );
  } else {
    const preliminaryCross = unwrappedCross;
    allocationWidth = resolveAxis(node, context, 'x', rootProfile(titleX, preliminaryCross, paddingX, 0, false));
    const preliminaryContentWidth = Math.max(0, allocationWidth - paddingX);
    titleResult = finalTitleProbe(context, titleHandle, preliminaryContentWidth);
    const finalTitleY = {
      minimum: titleResult?.slotSize.height ?? 0,
      natural: titleResult?.slotSize.height ?? 0,
    };
    const preliminaryY = rootProfile(finalTitleY, intrinsicMain, paddingY, effectiveTitleGap, true);
    allocationHeight = resolveAxis(node, context, 'y', preliminaryY);
    const preliminaryBodyHeight = Math.max(0, allocationHeight - paddingY - finalTitleY.natural - effectiveTitleGap);
    flowPlan = pairedFlowPlanOf(node.content, flowItems, { availableMainSize: preliminaryBodyHeight });
    if (node.size.y.kind === LayoutAxisSizeKind.Content && context.proposal.y.kind !== LayoutAxisProposalKind.Exact) {
      const formedMain = pairedFlowAxisProfileOf(flowPlan, node.content.direction, 'y');
      allocationHeight = resolveAxis(
        node,
        context,
        'y',
        rootProfile(finalTitleY, formedMain, paddingY, effectiveTitleGap, true),
      );
    }
    if (node.size.x.kind === LayoutAxisSizeKind.Content && context.proposal.x.kind !== LayoutAxisProposalKind.Exact) {
      const reconciledCross = pairedFlowAxisProfileOf(flowPlan, node.content.direction, 'x');
      const reconciled = resolveAxis(node, context, 'x', rootProfile(titleX, reconciledCross, paddingX, 0, false));
      allocationWidth = Math.max(allocationWidth, reconciled);
    }
  }

  const allocation = Object.freeze({ x: 0, y: 0, width: allocationWidth, height: allocationHeight });
  const contentBounds = contentRectOf(allocation, padding);
  const titleHeight = titleResult?.slotSize.height ?? 0;
  const structuralBodyWidth = flowPlan.bounds.width;
  const bodyOrigin = Object.freeze({
    x: alignedContentX(contentBounds, structuralBodyWidth, node.contentAlign),
    y: contentBounds.y + titleHeight + effectiveTitleGap,
  });
  const structuralPlacement = translatePairedFlowPlan(flowPlan, bodyOrigin);
  const finalItems = structuralPlacement.slots.map(slots => {
    const measuredItem = measured[slots.sourceIndex];
    const sample = placeFinalChild(
      context,
      measuredItem.sampleHandle,
      slots.primary,
      `sample:${measuredItem.authored.key}`,
      measuredItem.sourceIndex,
      allocation,
      node.overflow,
    );
    const label =
      slots.secondary === null || measuredItem.labelHandle === undefined
        ? null
        : placeFinalChild(
            context,
            measuredItem.labelHandle,
            slots.secondary,
            `label:${measuredItem.authored.key}`,
            measuredItem.sourceIndex,
            allocation,
            node.overflow,
          );
    const children = label === null ? [sample] : [sample, label];
    return Object.freeze({ measured: measuredItem, sample, label, geometry: geometryOf(children) });
  });
  const bodyAllocationRects = finalItems.map(item => item.geometry.allocationBounds);
  const bodyBounds =
    structuralPlacement.lines.length === 0
      ? null
      : unionLayoutArtifactRects([structuralPlacement.bounds, ...bodyAllocationRects]);
  const titleSlot =
    titleResult === undefined
      ? undefined
      : Object.freeze({
          x: alignedContentX(contentBounds, titleResult.slotSize.width, node.contentAlign),
          y: contentBounds.y,
          width: titleResult.slotSize.width,
          height: titleResult.slotSize.height,
        });
  const titlePlaced =
    titleHandle === undefined || titleResult === undefined || titleSlot === undefined
      ? null
      : placeFinalChild(context, titleHandle, titleSlot, 'title', 0, allocation, node.overflow, titleResult);
  const allPlaced = [
    ...(titlePlaced === null ? [] : [titlePlaced]),
    ...finalItems.flatMap(item => (item.label === null ? [item.sample] : [item.sample, item.label])),
  ];
  const allocationScope = replayLayoutChildren(context, allPlaced, allocation, node.overflow);
  const authoredRootScope = context.scope(authoredScopeProps, [allocationScope]);
  const artifactItems = finalItems.map(item =>
    Object.freeze({
      key: item.measured.authored.key,
      sourceIndex: item.measured.sourceIndex,
      geometry: item.geometry,
      sample: item.sample.artifact,
      label: item.label?.artifact ?? null,
    }),
  );

  return {
    children: [authoredRootScope],
    allocationBounds: allocation,
    artifact: Object.freeze({
      kind: LegendContentKind.Items,
      container: createLayoutArtifactContainer(
        allocation,
        contentBounds,
        allPlaced.map(placed => placed.baseArtifact),
      ),
      title: titlePlaced?.artifact ?? null,
      bodyBounds,
      items: artifactItems,
    }),
  };
};
