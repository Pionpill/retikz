import type {
  LayoutAlignmentGuide,
  LayoutAxisProposal,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import {
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
} from '@retikz/core';

import type { LayoutInsets, LayoutRect } from '../internal';
import type { IROverlayLayout, IROverlayLayoutItem, OverlayLayoutArtifact } from './types';

import {
  alignResolvedLayoutSlot,
  compensatedLayoutSum,
  contentRectOf,
  createLayoutArtifactAlignmentGuide,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
} from '../internal';
import { LayoutAlignment, LayoutAxisSizeKind, LayoutOverflow } from '../shared';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';
import { overlayStructuralGuideOffset, placeOverlayItem, resolveOverlayProfile, sortOverlayPaintOrder } from './solve';

type IntrinsicMode = 'minimum' | 'natural';

type MeasuredOverlayItem = Readonly<{
  authored: IROverlayLayoutItem;
  sourceIndex: number;
  margin: LayoutInsets;
}>;

type OverlayProfileResults = Readonly<{
  xResult: LayoutChildResult;
  yResult: LayoutChildResult;
}>;

type PlacedOverlayItem = Readonly<{
  authored: IROverlayLayoutItem;
  sourceIndex: number;
  margin: LayoutInsets;
  slotBounds: LayoutRect;
  alignment: IROverlayLayout['alignItems'];
  result: LayoutChildResult;
  translation: Readonly<{ x: number; y: number }>;
}>;

/** 创建 intrinsic 单轴 proposal */
const intrinsicProposal = (mode: IntrinsicMode): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
});

/** 创建 exact 单轴 proposal */
const exactProposal = (value: number): LayoutAxisProposal => ({ kind: LayoutAxisProposalKind.Exact, value });

/** 创建从零开始的有限 range proposal */
const boundedProposal = (max: number): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Range,
  min: 0,
  max,
});

/** 执行一次必需的 child probe，并在失败时保留 Core occurrence 提升错误 */
const requiredProbe = (
  context: LayoutCompositeCompileContext,
  child: IROverlayLayoutItem['child'],
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

/** 计算当前轴在求 contribution 前可确定的有限 content-box 上限 */
const finiteContentLimitOf = (
  node: IROverlayLayout,
  axis: 'x' | 'y',
  proposal: LayoutAxisProposal,
  padding: LayoutInsets,
): number | undefined => {
  const policy = node.size[axis];
  let allocation: number | undefined;
  if (policy.kind === LayoutAxisSizeKind.Fixed) {
    allocation = policy.value;
  } else if (policy.kind === LayoutAxisSizeKind.Fill) {
    allocation = resolveLayoutAxisSize({
      axis,
      policy,
      proposal,
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  } else if (proposal.kind === LayoutAxisProposalKind.Exact) {
    allocation = resolveLayoutAxisSize({
      axis,
      policy,
      proposal,
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  } else if (proposal.kind === LayoutAxisProposalKind.Range && proposal.max !== undefined) {
    allocation = resolveLayoutAxisSize({
      axis,
      policy,
      proposal: exactProposal(proposal.max),
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  }
  const paddingSize = axis === 'x' ? padding.left + padding.right : padding.top + padding.bottom;
  return allocation === undefined ? undefined : Math.max(0, allocation - paddingSize);
};

/** 求一个 Overlay item 在指定 intrinsic profile 下的物理 x→y probe 链 */
const probeOverlayProfile = (
  context: LayoutCompositeCompileContext,
  node: IROverlayLayout,
  item: MeasuredOverlayItem,
  mode: IntrinsicMode,
  finiteXLimit: number | undefined,
  finiteYLimit: number | undefined,
): OverlayProfileResults => {
  const placement = item.authored.placement;
  const xProposal =
    placement.kind === OverlayPlacementKind.Positioned && placement.width !== undefined
      ? exactProposal(placement.width)
      : intrinsicProposal(mode);
  const yBasis =
    placement.kind === OverlayPlacementKind.Positioned
      ? placement.height === undefined
        ? intrinsicProposal('natural')
        : exactProposal(placement.height)
      : finiteYLimit === undefined
        ? intrinsicProposal('natural')
        : boundedProposal(Math.max(0, finiteYLimit - item.margin.top - item.margin.bottom));
  const xResult = requiredProbe(context, item.authored.child, { x: xProposal, y: yBasis });

  let contextualX: LayoutAxisProposal;
  if (placement.kind === OverlayPlacementKind.Positioned) {
    contextualX = exactProposal(xResult.slotSize.width);
  } else if (finiteXLimit === undefined) {
    contextualX = exactProposal(xResult.slotSize.width);
  } else {
    const available = Math.max(0, finiteXLimit - item.margin.left - item.margin.right);
    const justify = item.authored.justifySelf ?? node.justifyItems;
    contextualX = justify === LayoutAlignment.Stretch ? exactProposal(available) : boundedProposal(available);
  }
  const yProposal =
    placement.kind === OverlayPlacementKind.Positioned && placement.height !== undefined
      ? exactProposal(placement.height)
      : intrinsicProposal(mode);
  const yResult = requiredProbe(context, item.authored.child, { x: contextualX, y: yProposal });
  return Object.freeze({ xResult, yResult });
};

/** 计算包含 padding 的单轴 container contribution */
const containerContribution = (content: number, start: number, end: number): number =>
  compensatedLayoutSum([start, content, end]);

/** 读取已 placement item 的真实 guide 或 allocation edge */
const placedGuideCoordinate = (
  placed: PlacedOverlayItem,
  name: 'first-baseline' | 'last-baseline',
): Readonly<{ coordinate: number; real: boolean }> => {
  const guide = placed.result.alignmentGuides?.find(
    value => value.dimension === LayoutAlignmentGuideDimension.Y && value.name === name,
  );
  if (guide !== undefined) return { coordinate: guide.position + placed.translation.y, real: true };
  const edge =
    name === LayoutAlignmentGuideName.FirstBaseline
      ? placed.result.allocationBounds.y
      : placed.result.allocationBounds.y + placed.result.allocationBounds.height;
  return { coordinate: edge + placed.translation.y, real: false };
};

/** 选择 Overlay 对父级暴露的稳定 baseline guide */
const outgoingOverlayGuide = (
  name: 'first-baseline' | 'last-baseline',
  placed: ReadonlyArray<PlacedOverlayItem>,
  baselineTarget: number | undefined,
): number => {
  if (baselineTarget !== undefined) return baselineTarget;
  const ordered = [...placed].sort((first, second) => first.sourceIndex - second.sourceIndex);
  const traversal = name === LayoutAlignmentGuideName.FirstBaseline ? ordered : [...ordered].reverse();
  const real = traversal.map(item => placedGuideCoordinate(item, name)).find(candidate => candidate.real);
  if (real !== undefined) return real.coordinate;
  return placedGuideCoordinate(traversal[0], name).coordinate;
};

/** 编译 Standard OverlayLayout 的双 profile probe、placement、stacking 与 replay 流程 */
export const compileOverlayLayout = (
  node: IROverlayLayout,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<OverlayLayoutArtifact> => {
  const padding = normalizeLayoutSpacing(node.padding);
  const finiteXLimit = finiteContentLimitOf(node, 'x', context.proposal.x, padding);
  const finiteYLimit = finiteContentLimitOf(node, 'y', context.proposal.y, padding);
  const measured: ReadonlyArray<MeasuredOverlayItem> = node.children.map((authored, sourceIndex) =>
    Object.freeze({ authored, sourceIndex, margin: normalizeLayoutSpacing(authored.margin) }),
  );
  const minimumResults = measured.map(item =>
    probeOverlayProfile(context, node, item, 'minimum', finiteXLimit, finiteYLimit),
  );
  const naturalResults = measured.map(item =>
    probeOverlayProfile(context, node, item, 'natural', finiteXLimit, finiteYLimit),
  );
  const profileOf = (results: ReadonlyArray<OverlayProfileResults>) =>
    resolveOverlayProfile(
      measured.map((item, sourceIndex) => ({
        sourceIndex,
        placement: item.authored.placement,
        margin: item.margin,
        offset: item.authored.offset,
        alignment: item.authored.alignSelf ?? node.alignItems,
        sizeParticipation: item.authored.sizeParticipation,
        xResult: results[sourceIndex].xResult,
        yResult: results[sourceIndex].yResult,
      })),
    );
  const minimumProfile = profileOf(minimumResults);
  const naturalProfile = profileOf(naturalResults);
  const width = resolveLayoutAxisSize({
    axis: 'x',
    policy: node.size.x,
    proposal: context.proposal.x,
    minimumContribution: containerContribution(minimumProfile.contentSize.width, padding.left, padding.right),
    naturalContribution: containerContribution(naturalProfile.contentSize.width, padding.left, padding.right),
  }).allocationSize;
  const height = resolveLayoutAxisSize({
    axis: 'y',
    policy: node.size.y,
    proposal: context.proposal.y,
    minimumContribution: containerContribution(minimumProfile.contentSize.height, padding.top, padding.bottom),
    naturalContribution: containerContribution(naturalProfile.contentSize.height, padding.top, padding.bottom),
  }).allocationSize;
  const allocation: LayoutRect = Object.freeze({ x: 0, y: 0, width, height });
  const content = contentRectOf(allocation, padding);

  const finalResults = measured.map((item, sourceIndex) => {
    const placement = item.authored.placement;
    if (placement.kind === OverlayPlacementKind.Positioned) {
      const natural = naturalResults[sourceIndex];
      return requiredProbe(context, item.authored.child, {
        x: exactProposal(placement.width ?? natural.xResult.slotSize.width),
        y: exactProposal(placement.height ?? natural.yResult.slotSize.height),
      });
    }
    const availableWidth = Math.max(0, content.width - item.margin.left - item.margin.right);
    const availableHeight = Math.max(0, content.height - item.margin.top - item.margin.bottom);
    const justify = item.authored.justifySelf ?? node.justifyItems;
    const align = item.authored.alignSelf ?? node.alignItems;
    return requiredProbe(context, item.authored.child, {
      x: justify === LayoutAlignment.Stretch ? exactProposal(availableWidth) : boundedProposal(availableWidth),
      y: align === LayoutAlignment.Stretch ? exactProposal(availableHeight) : boundedProposal(availableHeight),
    });
  });

  const baselineTargetOf = (name: 'first-baseline' | 'last-baseline'): number | undefined => {
    const participants = measured.filter(
      item =>
        item.authored.placement.kind === OverlayPlacementKind.Aligned &&
        item.authored.sizeParticipation === LayoutSizeParticipation.Include &&
        (item.authored.alignSelf ?? node.alignItems) === name,
    );
    if (participants.length === 0) return undefined;
    if (name === LayoutAlignmentGuideName.FirstBaseline) {
      const ascent = Math.max(
        ...participants.map(
          item => item.margin.top + overlayStructuralGuideOffset(finalResults[item.sourceIndex], name).offset,
        ),
      );
      return content.y + ascent;
    }
    const descent = Math.max(
      ...participants.map(item => {
        const result = finalResults[item.sourceIndex];
        return item.margin.bottom + result.slotSize.height - overlayStructuralGuideOffset(result, name).offset;
      }),
    );
    return content.y + content.height - descent;
  };
  const firstTarget = baselineTargetOf(LayoutAlignmentGuideName.FirstBaseline);
  const lastTarget = baselineTargetOf(LayoutAlignmentGuideName.LastBaseline);

  const placedBySource: Array<PlacedOverlayItem> = measured.map((item, sourceIndex) => {
    const authored = item.authored;
    const result = finalResults[sourceIndex];
    const justify = authored.justifySelf ?? node.justifyItems;
    const alignment = authored.alignSelf ?? node.alignItems;
    const geometry = placeOverlayItem({
      placement: authored.placement,
      content,
      margin: item.margin,
      offset: authored.offset,
      justify,
      align: alignment,
      result,
    });
    let resolvedSlot =
      authored.placement.kind === OverlayPlacementKind.Positioned
        ? geometry.slot
        : alignResolvedLayoutSlot(geometry.slot, result, justify, alignment);
    let y = geometry.translation.y;
    if (authored.placement.kind === OverlayPlacementKind.Aligned && alignment === LayoutAlignment.FirstBaseline) {
      const guide = result.alignmentGuides?.find(
        value =>
          value.dimension === LayoutAlignmentGuideDimension.Y && value.name === LayoutAlignmentGuideName.FirstBaseline,
      );
      const source = guide?.position ?? result.allocationBounds.y;
      y = (firstTarget ?? content.y) - source;
      resolvedSlot = Object.freeze({
        ...resolvedSlot,
        y:
          (firstTarget ?? content.y) -
          overlayStructuralGuideOffset(result, LayoutAlignmentGuideName.FirstBaseline).offset,
      });
    } else if (authored.placement.kind === OverlayPlacementKind.Aligned && alignment === LayoutAlignment.LastBaseline) {
      const guide = result.alignmentGuides?.find(
        value =>
          value.dimension === LayoutAlignmentGuideDimension.Y && value.name === LayoutAlignmentGuideName.LastBaseline,
      );
      const source = guide?.position ?? result.allocationBounds.y + result.allocationBounds.height;
      y = (lastTarget ?? content.y + content.height) - source;
      resolvedSlot = Object.freeze({
        ...resolvedSlot,
        y:
          (lastTarget ?? content.y + content.height) -
          overlayStructuralGuideOffset(result, LayoutAlignmentGuideName.LastBaseline).offset,
      });
    }
    return Object.freeze({
      authored,
      sourceIndex,
      margin: item.margin,
      slotBounds: Object.freeze(resolvedSlot),
      alignment,
      result,
      translation: Object.freeze({ x: geometry.translation.x, y }),
    });
  });

  const paintOrder = sortOverlayPaintOrder(
    placedBySource.map(item => ({
      sourceIndex: item.sourceIndex,
      zIndex: item.authored.zIndex,
    })),
  );
  const outputChildren = paintOrder.map(sourceIndex => {
    const placed = placedBySource[sourceIndex];
    const replay = context.replay(placed.result, {
      transforms: [{ kind: 'translate', x: placed.translation.x, y: placed.translation.y }],
    });
    return context.scope({ zIndex: placed.authored.zIndex }, [replay]);
  });
  const scope = context.scope(
    node.overflow === LayoutOverflow.Clip ? { clip: layoutClipOf(allocation) } : {},
    outputChildren,
  );

  const alignedIncluded = placedBySource.filter(
    item =>
      item.authored.placement.kind === OverlayPlacementKind.Aligned &&
      item.authored.sizeParticipation === LayoutSizeParticipation.Include,
  );
  let alignmentGuides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  if (alignedIncluded.length > 0) {
    alignmentGuides = Object.freeze([
      Object.freeze({
        name: LayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: outgoingOverlayGuide(LayoutAlignmentGuideName.FirstBaseline, alignedIncluded, firstTarget),
      }),
      Object.freeze({
        name: LayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: outgoingOverlayGuide(LayoutAlignmentGuideName.LastBaseline, alignedIncluded, lastTarget),
      }),
    ]);
  }
  const items = placedBySource.map(placed => {
    const usesBaseline =
      placed.authored.placement.kind === OverlayPlacementKind.Aligned &&
      (placed.alignment === LayoutAlignment.FirstBaseline || placed.alignment === LayoutAlignment.LastBaseline);
    return Object.freeze({
      ...createLayoutArtifactItem({
        key: placed.authored.key,
        sourceIndex: placed.sourceIndex,
        margin: placed.margin,
        slotBounds: placed.slotBounds,
        result: placed.result,
        translation: placed.translation,
        containerAllocation: allocation,
        overflow: node.overflow,
        ...(usesBaseline
          ? {
              alignmentGuide: createLayoutArtifactAlignmentGuide(placed.result, placed.translation, placed.alignment),
            }
          : {}),
      }),
      placement: placed.authored.placement.kind,
      sizeParticipation: placed.authored.sizeParticipation,
      zIndex: placed.authored.zIndex,
      ...(placed.authored.placement.kind === OverlayPlacementKind.Positioned
        ? {
            position: Object.freeze({
              target: Object.freeze({
                x: content.x + placed.authored.placement.at.x + placed.authored.offset.x,
                y: content.y + placed.authored.placement.at.y + placed.authored.offset.y,
              }),
              slotAnchor: Object.freeze({
                x: placed.slotBounds.x + placed.authored.placement.anchor.x * placed.slotBounds.width,
                y: placed.slotBounds.y + placed.authored.placement.anchor.y * placed.slotBounds.height,
              }),
            }),
          }
        : {}),
    });
  });
  return {
    children: [scope],
    allocationBounds: allocation,
    ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
    artifact: Object.freeze({
      kind: 'overlay',
      container: createLayoutArtifactContainer(allocation, content, items),
      items,
      paintOrder: paintOrder.map(sourceIndex => placedBySource[sourceIndex].authored.key),
    }),
  };
};
