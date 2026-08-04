import type {
  CompositeCompileScopeProps,
  IRChild,
  LayoutAxisProposal,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import { LayoutAxisProposalKind, LayoutChildProbeKind, LayoutIntrinsicMode } from '@retikz/core';

import type { LayoutRect } from '../../layout/internal';
import type { LayoutArtifactItemBase } from '../../layout/shared';
import type { LegendItemLine, LegendItemSlots, MeasuredLegendChild, MeasuredLegendItem } from './providers';
import type {
  IRLegend,
  IRLegendItem,
  LegendArtifact,
  LegendArtifactGeometry,
  LegendPlacedChildArtifact,
  LegendRampArtifact,
} from './types';

import {
  compensatedLayoutSum,
  contentRectOf,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
  unionLayoutArtifactRects,
} from '../../layout/internal';
import { LayoutAlignment, LayoutAxisSizeKind, LayoutOverflow } from '../../layout/shared';
import { LegendContentKind, LegendDirection } from './constants';
import {
  formedLinesCrossProfile,
  formedLinesMainProfile,
  formLegendItemLines,
  intrinsicItemsMainProfile,
  placeLegendItems,
} from './providers';
import { createLegendRampStructure, translateLegendRampStructure } from './providers';

/** 绑定待 probe 的 child 与稳定 inspection occurrence */
type ChildHandle = Readonly<{ child: IRChild; occurrence: number }>;

/** 把已度量 item 与最终 probe 所需 handle 组合 */
type CompileMeasuredItem = MeasuredLegendItem &
  Readonly<{
    sampleHandle: ChildHandle;
    labelHandle?: ChildHandle;
  }>;

/** 保存 child 最终放置、replay 与 artifact 所需状态 */
type FinalPlacedChild = Readonly<{
  /** 最终 exact probe 结果 */
  result: LayoutChildResult;
  /** child 在 Legend allocation 坐标中的结构 slot */
  slotBounds: LayoutRect;
  /** 从 child allocation 原点移动到目标 slot 的平移 */
  translation: Readonly<{ x: number; y: number }>;
  /** 供 container 汇总几何的共享布局 artifact */
  baseArtifact: LayoutArtifactItemBase;
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

/** 构造单轴 minimum 或 natural intrinsic proposal */
const intrinsicAxisProposal = (mode: 'minimum' | 'natural'): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
});

/** 构造双轴 minimum 或 natural intrinsic proposal */
const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutProposal => ({
  x: intrinsicAxisProposal(mode),
  y: intrinsicAxisProposal(mode),
});

/** 按结构 slot 构造双轴 exact proposal */
const exactProposal = (slot: LayoutRect): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: slot.width },
  y: { kind: LayoutAxisProposalKind.Exact, value: slot.height },
});

/** 执行一次必须成功的 child probe，并保留 Core failure occurrence */
const requiredProbe = (
  context: LayoutCompositeCompileContext,
  handle: ChildHandle,
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(handle.child, proposal, context.inspection.child(handle.occurrence));
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

/** 取得 child 的 minimum / natural 双轴结构 contribution */
const measureChild = (context: LayoutCompositeCompileContext, handle: ChildHandle): MeasuredLegendChild =>
  Object.freeze({
    minimum: requiredProbe(context, handle, intrinsicProposal('minimum')),
    natural: requiredProbe(context, handle, intrinsicProposal('natural')),
  });

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

/** 合并 title、body、gap 与 padding 为根容器轴向 profile */
const rootProfile = (
  axis: 'x' | 'y',
  title: Readonly<{ minimum: number; natural: number }>,
  body: Readonly<{ minimum: number; natural: number }>,
  paddingSize: number,
  titleGap: number,
  stackTitle: boolean,
): Readonly<{ minimum: number; natural: number }> =>
  stackTitle
    ? {
        minimum: compensatedLayoutSum([paddingSize, title.minimum, titleGap, body.minimum]),
        natural: compensatedLayoutSum([paddingSize, title.natural, titleGap, body.natural]),
      }
    : {
        minimum: compensatedLayoutSum([paddingSize, Math.max(title.minimum, body.minimum)]),
        natural: compensatedLayoutSum([paddingSize, Math.max(title.natural, body.natural)]),
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

/** 在最终 content width 下取得 title 的 range / natural probe */
const finalTitleProbe = (
  context: LayoutCompositeCompileContext,
  handle: ChildHandle | undefined,
  contentWidth: number,
): LayoutChildResult | undefined =>
  handle === undefined
    ? undefined
    : requiredProbe(context, handle, {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: contentWidth },
        y: intrinsicAxisProposal('natural'),
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
  handle: ChildHandle,
  slotBounds: LayoutRect,
  key: string,
  sourceIndex: number,
  containerAllocation: LayoutRect,
  overflow: IRLegend['overflow'],
  existingResult?: LayoutChildResult,
): FinalPlacedChild => {
  const result = existingResult ?? requiredProbe(context, handle, exactProposal(slotBounds));
  const translation = Object.freeze({
    x: slotBounds.x - result.allocationBounds.x,
    y: slotBounds.y - result.allocationBounds.y,
  });
  const baseArtifact = createLayoutArtifactItem({
    key,
    sourceIndex,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    slotBounds,
    result,
    translation,
    containerAllocation,
    overflow,
  });
  return Object.freeze({
    result,
    slotBounds,
    translation,
    baseArtifact,
    artifact: stripPlacedArtifact(baseArtifact),
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
  const titleMeasured = titleHandle === undefined ? undefined : measureChild(context, titleHandle);
  const sampleMeasured = measureChild(context, sampleHandle);
  const measuredTicks = ramp.ticks.map((tick, sourceIndex) => {
    const labelHandle = tickHandles[sourceIndex].labelHandle;
    return Object.freeze({
      key: tick.key,
      sourceIndex,
      offset: tick.offset,
      ...(labelHandle === undefined ? {} : { labelHandle, label: measureChild(context, labelHandle).natural }),
    });
  });
  const localStructure = createLegendRampStructure(ramp, sampleMeasured.natural, measuredTicks);
  const padding = normalizeLayoutSpacing(node.padding);
  const paddingX = paddingAxisSize(padding, 'x');
  const paddingY = paddingAxisSize(padding, 'y');
  const titleX = titleAxisProfile(titleMeasured, 'x');
  const bodyX = { minimum: localStructure.bounds.width, natural: localStructure.bounds.width };
  const allocationWidth = resolveAxis(node, context, 'x', rootProfile('x', titleX, bodyX, paddingX, 0, false));
  const contentWidth = Math.max(0, allocationWidth - paddingX);
  const titleResult = finalTitleProbe(context, titleHandle, contentWidth);
  const titleHeight = titleResult?.slotSize.height ?? 0;
  const effectiveTitleGap = titleResult === undefined ? 0 : node.titleGap;
  const bodyY = { minimum: localStructure.bounds.height, natural: localStructure.bounds.height };
  const allocationHeight = resolveAxis(
    node,
    context,
    'y',
    rootProfile('y', { minimum: titleHeight, natural: titleHeight }, bodyY, paddingY, effectiveTitleGap, true),
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
  const replayed = allPlaced.map(placed =>
    context.replay(placed.result, {
      transforms: [{ kind: 'translate', x: placed.translation.x, y: placed.translation.y }],
    }),
  );
  const allocationScope = context.scope(
    node.overflow === LayoutOverflow.Clip ? { clip: layoutClipOf(allocation) } : {},
    replayed,
  );
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
  const titleMeasured = titleHandle === undefined ? undefined : measureChild(context, titleHandle);
  const measured: Array<CompileMeasuredItem> = node.content.items.map((authored: IRLegendItem, sourceIndex) => {
    const handles = itemHandles[sourceIndex];
    return Object.freeze({
      authored,
      sourceIndex,
      sample: measureChild(context, handles.sampleHandle),
      ...(handles.labelHandle === undefined ? {} : { label: measureChild(context, handles.labelHandle) }),
      ...handles,
    });
  });
  const padding = normalizeLayoutSpacing(node.padding);
  const paddingX = paddingAxisSize(padding, 'x');
  const paddingY = paddingAxisSize(padding, 'y');
  const hasBody = measured.length > 0;
  const effectiveTitleGap = titleMeasured !== undefined && hasBody ? node.titleGap : 0;
  const titleX = titleAxisProfile(titleMeasured, 'x');
  const intrinsicMain = intrinsicItemsMainProfile(node.content, measured);
  const unwrappedLines = formLegendItemLines(node.content, measured, Number.MAX_VALUE);
  const unwrappedCross = formedLinesCrossProfile(node.content, unwrappedLines);

  let allocationWidth: number;
  let allocationHeight: number;
  let lines: ReadonlyArray<LegendItemLine>;
  let titleResult: LayoutChildResult | undefined;

  if (node.content.direction === LegendDirection.Horizontal) {
    const preliminaryX = rootProfile('x', titleX, intrinsicMain, paddingX, 0, false);
    allocationWidth = resolveAxis(node, context, 'x', preliminaryX);
    const preliminaryContentWidth = Math.max(0, allocationWidth - paddingX);
    lines = formLegendItemLines(node.content, measured, preliminaryContentWidth);
    if (node.size.x.kind === LayoutAxisSizeKind.Content && context.proposal.x.kind !== LayoutAxisProposalKind.Exact) {
      const formedMain = formedLinesMainProfile(lines);
      allocationWidth = resolveAxis(node, context, 'x', rootProfile('x', titleX, formedMain, paddingX, 0, false));
    }
    const contentWidth = Math.max(0, allocationWidth - paddingX);
    titleResult = finalTitleProbe(context, titleHandle, contentWidth);
    const finalTitleY = {
      minimum: titleResult?.slotSize.height ?? 0,
      natural: titleResult?.slotSize.height ?? 0,
    };
    const rowsCross = formedLinesCrossProfile(node.content, lines);
    allocationHeight = resolveAxis(
      node,
      context,
      'y',
      rootProfile('y', finalTitleY, rowsCross, paddingY, effectiveTitleGap, true),
    );
  } else {
    const preliminaryCross = unwrappedCross;
    allocationWidth = resolveAxis(node, context, 'x', rootProfile('x', titleX, preliminaryCross, paddingX, 0, false));
    const preliminaryContentWidth = Math.max(0, allocationWidth - paddingX);
    titleResult = finalTitleProbe(context, titleHandle, preliminaryContentWidth);
    const finalTitleY = {
      minimum: titleResult?.slotSize.height ?? 0,
      natural: titleResult?.slotSize.height ?? 0,
    };
    const preliminaryY = rootProfile('y', finalTitleY, intrinsicMain, paddingY, effectiveTitleGap, true);
    allocationHeight = resolveAxis(node, context, 'y', preliminaryY);
    const preliminaryBodyHeight = Math.max(0, allocationHeight - paddingY - finalTitleY.natural - effectiveTitleGap);
    lines = formLegendItemLines(node.content, measured, preliminaryBodyHeight);
    if (node.size.y.kind === LayoutAxisSizeKind.Content && context.proposal.y.kind !== LayoutAxisProposalKind.Exact) {
      const formedMain = formedLinesMainProfile(lines);
      allocationHeight = resolveAxis(
        node,
        context,
        'y',
        rootProfile('y', finalTitleY, formedMain, paddingY, effectiveTitleGap, true),
      );
    }
    if (node.size.x.kind === LayoutAxisSizeKind.Content && context.proposal.x.kind !== LayoutAxisProposalKind.Exact) {
      const reconciledCross = formedLinesCrossProfile(node.content, lines);
      const reconciled = resolveAxis(node, context, 'x', rootProfile('x', titleX, reconciledCross, paddingX, 0, false));
      allocationWidth = Math.max(allocationWidth, reconciled);
    }
  }

  const allocation = Object.freeze({ x: 0, y: 0, width: allocationWidth, height: allocationHeight });
  const contentBounds = contentRectOf(allocation, padding);
  const titleHeight = titleResult?.slotSize.height ?? 0;
  const structuralBodyWidth =
    node.content.direction === LegendDirection.Horizontal
      ? formedLinesMainProfile(lines).natural
      : formedLinesCrossProfile(node.content, lines).natural;
  const bodyOrigin = Object.freeze({
    x: alignedContentX(contentBounds, structuralBodyWidth, node.contentAlign),
    y: contentBounds.y + titleHeight + effectiveTitleGap,
  });
  const structuralPlacement = placeLegendItems(node.content, measured, lines, bodyOrigin);
  const finalItems = structuralPlacement.slots.map((slots: LegendItemSlots) => {
    const measuredItem = measured[slots.sourceIndex];
    const sample = placeFinalChild(
      context,
      measuredItem.sampleHandle,
      slots.sample,
      `sample:${measuredItem.authored.key}`,
      measuredItem.sourceIndex,
      allocation,
      node.overflow,
    );
    const label =
      slots.label === null || measuredItem.labelHandle === undefined
        ? null
        : placeFinalChild(
            context,
            measuredItem.labelHandle,
            slots.label,
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
    structuralPlacement.bodyBounds === null
      ? null
      : unionLayoutArtifactRects([structuralPlacement.bodyBounds, ...bodyAllocationRects]);
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
  const replayed = allPlaced.map(placed =>
    context.replay(placed.result, {
      transforms: [{ kind: 'translate', x: placed.translation.x, y: placed.translation.y }],
    }),
  );
  const allocationScope = context.scope(
    node.overflow === LayoutOverflow.Clip ? { clip: layoutClipOf(allocation) } : {},
    replayed,
  );
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
