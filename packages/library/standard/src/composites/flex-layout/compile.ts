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

import type { LayoutInsets, LayoutRect } from '../shared/layout/internal';
import type { IRFlexLayout, IRFlexLayoutItem } from './types';

import { LayoutAlignment, LayoutAxisSizeKind, LayoutDistribution, LayoutOverflow } from '../shared/layout';
import {
  alignAllocationInSlot,
  compensatedLayoutSum,
  contentRectOf,
  layoutClipOf,
  layoutEpsilon,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
} from '../shared/layout/internal';
import { FlexLayoutDirection, FlexLayoutWrap } from './constants';
import { formFlexLines, resolveFlexLineMainSizes, resolveFlexSpaceDistribution } from './solve';

type PhysicalAxis = 'x' | 'y';

type MeasuredFlexItem = Readonly<{
  authored: IRFlexLayoutItem;
  sourceIndex: number;
  margin: LayoutInsets;
  flexBaseSlot: number;
  effectiveMin: number;
  effectiveMax?: number;
}>;

type FlexLineState = {
  itemIndexes: ReadonlyArray<number>;
  mainSlots: ReadonlyArray<number>;
  mainRemaining: number;
  initialCrossSize: number;
  finalCrossSize: number;
  crossStart: number;
  firstTarget?: number;
  lastTarget?: number;
};

type PlacedFlexItem = Readonly<{
  sourceIndex: number;
  result: LayoutChildResult;
  translation: Readonly<{ x: number; y: number }>;
  alignment: string;
}>;

/** 从无原点 slot 读取指定物理轴尺寸 */
const slotSizeOn = (result: LayoutChildResult, axis: PhysicalAxis): number =>
  axis === 'x' ? result.slotSize.width : result.slotSize.height;

/** 从 allocation bounds 读取指定物理轴起点 */
const allocationStartOn = (result: LayoutChildResult, axis: PhysicalAxis): number =>
  axis === 'x' ? result.allocationBounds.x : result.allocationBounds.y;

/** 把 main/cross 单轴 proposal 映射回 Core 物理双轴 proposal */
const physicalProposal = (
  mainAxis: PhysicalAxis,
  main: LayoutAxisProposal,
  cross: LayoutAxisProposal,
): LayoutProposal => (mainAxis === 'x' ? { x: main, y: cross } : { x: cross, y: main });

/** 创建 intrinsic 单轴 proposal */
const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
});

/** 创建 exact 单轴 proposal */
const exactProposal = (value: number): LayoutAxisProposal => ({ kind: LayoutAxisProposalKind.Exact, value });

/** 读取方向对应的 main/cross 物理轴 */
const axesOf = (direction: IRFlexLayout['direction']): Readonly<{ main: PhysicalAxis; cross: PhysicalAxis }> =>
  direction === FlexLayoutDirection.Row || direction === FlexLayoutDirection.RowReverse
    ? { main: 'x', cross: 'y' }
    : { main: 'y', cross: 'x' };

/** 判断 main traversal 是否沿物理轴反向 */
const isMainReverse = (direction: IRFlexLayout['direction']): boolean =>
  direction === FlexLayoutDirection.RowReverse || direction === FlexLayoutDirection.ColumnReverse;

/** 读取方向语义下的 main-start 与 main-end margin */
const mainMarginsOf = (
  margin: LayoutInsets,
  direction: IRFlexLayout['direction'],
): Readonly<{ start: number; end: number }> => {
  if (direction === FlexLayoutDirection.Row) return { start: margin.left, end: margin.right };
  if (direction === FlexLayoutDirection.RowReverse) return { start: margin.right, end: margin.left };
  if (direction === FlexLayoutDirection.Column) return { start: margin.top, end: margin.bottom };
  return { start: margin.bottom, end: margin.top };
};

/** 读取 cross 物理轴的 leading 与 trailing margin */
const crossMarginsOf = (margin: LayoutInsets, crossAxis: PhysicalAxis): Readonly<{ start: number; end: number }> =>
  crossAxis === 'x' ? { start: margin.left, end: margin.right } : { start: margin.top, end: margin.bottom };

/** 读取 allocation rect 的物理轴起点和尺寸 */
const rectAxis = (rect: LayoutRect, axis: PhysicalAxis): Readonly<{ start: number; size: number }> =>
  axis === 'x' ? { start: rect.x, size: rect.width } : { start: rect.y, size: rect.height };

/** 执行一次必需的 child probe，并在失败时保留 Core occurrence 提升错误 */
const requiredProbe = (
  context: LayoutCompositeCompileContext,
  child: IRFlexLayoutItem['child'],
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

/** 计算当前 cross policy 可确定的有限 content-box 上限 */
const finiteCrossLimitOf = (
  node: IRFlexLayout,
  crossAxis: PhysicalAxis,
  crossProposal: LayoutAxisProposal,
  padding: LayoutInsets,
): number | undefined => {
  const policy = node.size[crossAxis];
  let allocation: number | undefined;
  if (policy.kind === LayoutAxisSizeKind.Fixed) {
    allocation = policy.value;
  } else if (policy.kind === LayoutAxisSizeKind.Fill) {
    allocation = resolveLayoutAxisSize({
      axis: crossAxis,
      policy,
      proposal: crossProposal,
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  } else if (crossProposal.kind === LayoutAxisProposalKind.Exact) {
    allocation = resolveLayoutAxisSize({
      axis: crossAxis,
      policy,
      proposal: crossProposal,
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  } else if (crossProposal.kind === LayoutAxisProposalKind.Range && crossProposal.max !== undefined) {
    allocation = resolveLayoutAxisSize({
      axis: crossAxis,
      policy,
      proposal: exactProposal(crossProposal.max),
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  }
  if (allocation === undefined) return undefined;
  const paddingSize =
    crossAxis === 'x'
      ? compensatedLayoutSum([padding.left, padding.right])
      : compensatedLayoutSum([padding.top, padding.bottom]);
  return Math.max(0, allocation - paddingSize);
};

/** 按 proposal 矩阵构造 child basis 阶段的 cross proposal */
const basisCrossProposal = (finiteCrossLimit: number | undefined): LayoutAxisProposal =>
  finiteCrossLimit === undefined
    ? intrinsicProposal('natural')
    : { kind: LayoutAxisProposalKind.Range, min: 0, max: finiteCrossLimit };

/** 用 item probe 结果构造 Flex main solver 输入 */
const mainSolverItemOf = (item: MeasuredFlexItem, direction: IRFlexLayout['direction']) => {
  const margins = mainMarginsOf(item.margin, direction);
  return {
    key: item.authored.key,
    sourceIndex: item.sourceIndex,
    flexBaseSlot: item.flexBaseSlot,
    min: item.effectiveMin,
    ...(item.effectiveMax === undefined ? {} : { max: item.effectiveMax }),
    grow: item.authored.grow,
    shrink: item.authored.shrink,
    marginStart: margins.start,
    marginEnd: margins.end,
  };
};

/** 计算若干 outer main contribution 与固定 gaps 的稳定总和 */
const totalOuterMainContribution = (
  contributions: ReadonlyArray<number>,
  gap: number,
  paddingStart: number,
  paddingEnd: number,
): number =>
  compensatedLayoutSum([paddingStart, paddingEnd, ...contributions, gap * Math.max(0, contributions.length - 1)]);

/** 读取 child guide 相对结构 slot 起点的稳定 offset */
const structuralGuideOffset = (
  result: LayoutChildResult,
  axis: PhysicalAxis,
  name: 'first-baseline' | 'last-baseline',
): Readonly<{ offset: number; real: boolean }> => {
  const guide = result.alignmentGuides?.find(value => value.dimension === axis && value.name === name);
  const slotSize = slotSizeOn(result, axis);
  if (guide === undefined)
    return { offset: name === LayoutAlignmentGuideName.FirstBaseline ? 0 : slotSize, real: false };
  return {
    offset: Math.min(Math.max(guide.position - allocationStartOn(result, axis), 0), slotSize),
    real: true,
  };
};

/** 计算一条 line 的结构 cross size 与 baseline target */
const resolveLineCrossMetrics = (
  itemIndexes: ReadonlyArray<number>,
  items: ReadonlyArray<MeasuredFlexItem>,
  crossResults: ReadonlyArray<LayoutChildResult>,
  crossAxis: PhysicalAxis,
  alignItems: IRFlexLayout['alignItems'],
): Readonly<{ size: number; firstTarget?: number; lastTarget?: number }> => {
  let ordinary = 0;
  let firstAscent = 0;
  let firstDescent = 0;
  let lastAscent = 0;
  let lastDescent = 0;
  let hasFirst = false;
  let hasLast = false;
  for (const index of itemIndexes) {
    const item = items[index];
    const result = crossResults[index];
    const margins = crossMarginsOf(item.margin, crossAxis);
    const slotSize = slotSizeOn(result, crossAxis);
    const alignment = item.authored.alignSelf ?? alignItems;
    ordinary = Math.max(ordinary, compensatedLayoutSum([margins.start, slotSize, margins.end]));
    if (alignment === LayoutAlignment.FirstBaseline) {
      const guide = structuralGuideOffset(result, crossAxis, LayoutAlignmentGuideName.FirstBaseline);
      firstAscent = Math.max(firstAscent, margins.start + guide.offset);
      firstDescent = Math.max(firstDescent, slotSize - guide.offset + margins.end);
      hasFirst = true;
    }
    if (alignment === LayoutAlignment.LastBaseline) {
      const guide = structuralGuideOffset(result, crossAxis, LayoutAlignmentGuideName.LastBaseline);
      lastAscent = Math.max(lastAscent, margins.start + guide.offset);
      lastDescent = Math.max(lastDescent, slotSize - guide.offset + margins.end);
      hasLast = true;
    }
  }
  const size = Math.max(ordinary, firstAscent + firstDescent, lastAscent + lastDescent);
  return {
    size,
    ...(hasFirst ? { firstTarget: firstAscent } : {}),
    ...(hasLast ? { lastTarget: size - lastDescent } : {}),
  };
};

/** 把 alignContent 剩余空间解析为 line slot 扩张、起始偏移与附加 gap */
const resolveLineDistribution = (
  distribution: IRFlexLayout['alignContent'],
  remaining: number,
  lineCount: number,
): Readonly<{ leading: number; between: number; stretch: number }> => {
  if (distribution === LayoutDistribution.Stretch && remaining > 0 && lineCount > 0) {
    return { leading: 0, between: 0, stretch: remaining / lineCount };
  }
  const nonStretch = distribution === LayoutDistribution.Stretch ? LayoutDistribution.Start : distribution;
  const resolved = resolveFlexSpaceDistribution(nonStretch, remaining, lineCount);
  return { ...resolved, stretch: 0 };
};

/** 计算一个 alignment 在 line cross slot 中的 child slot 起点 */
const itemCrossSlotStart = (
  line: FlexLineState,
  slotSize: number,
  margins: Readonly<{ start: number; end: number }>,
  alignment: IRFlexLayout['alignItems'],
  guideOffset: number,
): number => {
  if (alignment === LayoutAlignment.End) return line.crossStart + line.finalCrossSize - margins.end - slotSize;
  if (alignment === LayoutAlignment.Center) {
    const available = Math.max(0, line.finalCrossSize - margins.start - margins.end);
    return line.crossStart + margins.start + (available - slotSize) / 2;
  }
  if (alignment === LayoutAlignment.FirstBaseline && line.firstTarget !== undefined) {
    return line.crossStart + line.firstTarget - guideOffset;
  }
  if (alignment === LayoutAlignment.LastBaseline && line.lastTarget !== undefined) {
    return line.crossStart + line.lastTarget - guideOffset;
  }
  return line.crossStart + margins.start;
};

/** 读取 placement translation 后的真实 guide 或 allocation edge 坐标 */
const placedGuideCoordinate = (
  placed: PlacedFlexItem,
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

/** 为一条已 placement 的 row line 选择稳定 outgoing baseline */
const outgoingLineGuide = (
  name: 'first-baseline' | 'last-baseline',
  line: FlexLineState,
  placedBySource: ReadonlyArray<PlacedFlexItem | undefined>,
): number => {
  const traversal =
    name === LayoutAlignmentGuideName.FirstBaseline ? line.itemIndexes : [...line.itemIndexes].reverse();
  const participants = traversal
    .map(index => placedBySource[index])
    .filter((placed): placed is PlacedFlexItem => placed !== undefined && placed.alignment === name);
  if (participants.length > 0) {
    const candidates = [...participants]
      .sort((first, second) => first.sourceIndex - second.sourceIndex)
      .map(placed => ({ placed, ...placedGuideCoordinate(placed, name) }));
    const canonical = candidates.find(candidate => candidate.real) ?? candidates[0];
    for (const candidate of candidates) {
      if (
        Math.abs(candidate.coordinate - canonical.coordinate) >
        layoutEpsilon(candidate.coordinate, canonical.coordinate)
      ) {
        throw new Error(`FlexLayout ${name} participants did not resolve to one aligned coordinate`);
      }
    }
    return canonical.coordinate;
  }
  const placedTraversal = traversal
    .map(index => placedBySource[index])
    .filter((placed): placed is PlacedFlexItem => placed !== undefined);
  const real = placedTraversal.map(placed => placedGuideCoordinate(placed, name)).find(candidate => candidate.real);
  if (real !== undefined) return real.coordinate;
  const fallback = placedTraversal[0];
  return placedGuideCoordinate(fallback, name).coordinate;
};

/** 编译 Standard FlexLayout 的完整 probe、求解、placement 与 replay 流程 */
export const compileFlexLayout = (
  node: IRFlexLayout,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult => {
  const axes = axesOf(node.direction);
  const padding = normalizeLayoutSpacing(node.padding);
  const proposalByAxis = context.proposal;
  const mainProposal = proposalByAxis[axes.main];
  const crossProposal = proposalByAxis[axes.cross];
  const finiteCrossLimit = finiteCrossLimitOf(node, axes.cross, crossProposal, padding);
  const crossBasis = basisCrossProposal(finiteCrossLimit);

  const measured = node.children.map((authored, sourceIndex): MeasuredFlexItem => {
    const minimumResult = requiredProbe(
      context,
      authored.child,
      physicalProposal(axes.main, intrinsicProposal('minimum'), crossBasis),
    );
    const childMinimum = slotSizeOn(minimumResult, axes.main);
    const flexBaseSlot =
      authored.basis === 'content'
        ? slotSizeOn(
            requiredProbe(
              context,
              authored.child,
              physicalProposal(axes.main, intrinsicProposal('natural'), crossBasis),
            ),
            axes.main,
          )
        : authored.basis;
    const effectiveMax = authored.max;
    const effectiveMin =
      authored.min ?? (effectiveMax !== undefined && childMinimum > effectiveMax ? effectiveMax : childMinimum);
    return Object.freeze({
      authored,
      sourceIndex,
      margin: normalizeLayoutSpacing(authored.margin),
      flexBaseSlot,
      effectiveMin,
      ...(effectiveMax === undefined ? {} : { effectiveMax }),
    });
  });
  const mainItems = measured.map(item => mainSolverItemOf(item, node.direction));
  const mainGap = axes.main === 'x' ? node.columnGap : node.rowGap;
  const crossGap = axes.cross === 'x' ? node.columnGap : node.rowGap;
  const mainPadding =
    axes.main === 'x' ? { start: padding.left, end: padding.right } : { start: padding.top, end: padding.bottom };
  const crossPadding =
    axes.cross === 'x' ? { start: padding.left, end: padding.right } : { start: padding.top, end: padding.bottom };
  const minimumOuter = measured.map((item, index) => {
    const margins = mainMarginsOf(item.margin, node.direction);
    return compensatedLayoutSum([margins.start, mainItems[index].min, margins.end]);
  });
  const naturalOuter = measured.map((item, index) => {
    const margins = mainMarginsOf(item.margin, node.direction);
    const itemSpec = mainItems[index];
    const slot =
      itemSpec.max === undefined
        ? Math.max(itemSpec.flexBaseSlot, itemSpec.min)
        : Math.min(Math.max(itemSpec.flexBaseSlot, itemSpec.min), itemSpec.max);
    return compensatedLayoutSum([margins.start, slot, margins.end]);
  });
  const mainMinimumContent =
    node.wrap === FlexLayoutWrap.NoWrap
      ? totalOuterMainContribution(minimumOuter, mainGap, mainPadding.start, mainPadding.end)
      : compensatedLayoutSum([
          mainPadding.start,
          mainPadding.end,
          minimumOuter.length === 0 ? 0 : Math.max(...minimumOuter),
        ]);
  const mainNaturalContent = totalOuterMainContribution(naturalOuter, mainGap, mainPadding.start, mainPadding.end);
  const mainAllocation = resolveLayoutAxisSize({
    axis: axes.main,
    policy: node.size[axes.main],
    proposal: mainProposal,
    minimumContribution: mainMinimumContent,
    naturalContribution: mainNaturalContent,
  }).allocationSize;
  const preliminaryAllocation: LayoutRect =
    axes.main === 'x'
      ? { x: 0, y: 0, width: mainAllocation, height: 0 }
      : { x: 0, y: 0, width: 0, height: mainAllocation };
  const preliminaryContent = contentRectOf(preliminaryAllocation, padding);
  const mainContent = rectAxis(preliminaryContent, axes.main);
  const mainSizePolicy = node.size[axes.main];
  const hasFiniteWrapSpace =
    mainSizePolicy.kind !== LayoutAxisSizeKind.Content ||
    mainProposal.kind === LayoutAxisProposalKind.Exact ||
    (mainProposal.kind === LayoutAxisProposalKind.Range && mainProposal.max !== undefined) ||
    (mainProposal.kind === LayoutAxisProposalKind.Intrinsic && mainProposal.mode === LayoutIntrinsicMode.Minimum) ||
    ('max' in mainSizePolicy && mainSizePolicy.max !== undefined);
  const lineIndexes = formFlexLines(mainItems, {
    wrap: node.wrap,
    ...(hasFiniteWrapSpace ? { availableMainSize: mainContent.size } : {}),
    gap: mainGap,
  });
  const lineStates: Array<FlexLineState> = lineIndexes.map(itemIndexes => {
    const items = itemIndexes.map(index => mainItems[index]);
    const distribution = resolveFlexLineMainSizes(items, mainContent.size, mainGap);
    return {
      itemIndexes,
      mainSlots: distribution.values,
      mainRemaining: distribution.remaining,
      initialCrossSize: 0,
      finalCrossSize: 0,
      crossStart: 0,
    };
  });
  const mainSlotBySource: Array<number> = Array.from({ length: measured.length }, () => 0);
  lineStates.forEach(line =>
    line.itemIndexes.forEach((sourceIndex, index) => (mainSlotBySource[sourceIndex] = line.mainSlots[index])),
  );
  const crossResults = measured.map((item, sourceIndex) =>
    requiredProbe(
      context,
      item.authored.child,
      physicalProposal(
        axes.main,
        exactProposal(mainSlotBySource[sourceIndex]),
        finiteCrossLimit === undefined
          ? intrinsicProposal('natural')
          : { kind: LayoutAxisProposalKind.Range, min: 0, max: finiteCrossLimit },
      ),
    ),
  );
  lineStates.forEach(line => {
    const metrics = resolveLineCrossMetrics(line.itemIndexes, measured, crossResults, axes.cross, node.alignItems);
    line.initialCrossSize = metrics.size;
    line.finalCrossSize = metrics.size;
    line.firstTarget = metrics.firstTarget;
    line.lastTarget = metrics.lastTarget;
  });
  const initialLineCrossTotal = compensatedLayoutSum([
    ...lineStates.map(line => line.initialCrossSize),
    crossGap * Math.max(0, lineStates.length - 1),
  ]);
  const crossContribution = compensatedLayoutSum([crossPadding.start, initialLineCrossTotal, crossPadding.end]);
  const crossAllocation = resolveLayoutAxisSize({
    axis: axes.cross,
    policy: node.size[axes.cross],
    proposal: crossProposal,
    minimumContribution: crossContribution,
    naturalContribution: crossContribution,
  }).allocationSize;
  const allocation: LayoutRect =
    axes.main === 'x'
      ? { x: 0, y: 0, width: mainAllocation, height: crossAllocation }
      : { x: 0, y: 0, width: crossAllocation, height: mainAllocation };
  const content = contentRectOf(allocation, padding);
  const crossContent = rectAxis(content, axes.cross);
  if (lineStates.length === 1) {
    lineStates[0].finalCrossSize = crossContent.size;
  }
  const crossRemaining = crossContent.size - initialLineCrossTotal;
  const lineDistribution =
    lineStates.length > 1
      ? resolveLineDistribution(node.alignContent, crossRemaining, lineStates.length)
      : { leading: 0, between: 0, stretch: 0 };
  if (lineStates.length > 1 && lineDistribution.stretch !== 0) {
    lineStates.forEach(line => (line.finalCrossSize += lineDistribution.stretch));
  }
  lineStates.forEach(line => {
    if (line.lastTarget !== undefined) {
      line.lastTarget += line.finalCrossSize - line.initialCrossSize;
    }
  });
  const crossReverse = node.wrap === FlexLayoutWrap.WrapReverse;
  let crossCursor = crossReverse
    ? crossContent.start + crossContent.size - lineDistribution.leading
    : crossContent.start + lineDistribution.leading;
  for (const line of lineStates) {
    if (crossReverse) {
      crossCursor -= line.finalCrossSize;
      line.crossStart = crossCursor;
      crossCursor -= crossGap + lineDistribution.between;
    } else {
      line.crossStart = crossCursor;
      crossCursor += line.finalCrossSize + crossGap + lineDistribution.between;
    }
  }

  const placedBySource: Array<PlacedFlexItem | undefined> = Array.from({ length: measured.length });
  for (const line of lineStates) {
    const mainDistribution = resolveFlexSpaceDistribution(
      node.justifyContent,
      line.mainRemaining,
      line.itemIndexes.length,
    );
    const mainReverse = isMainReverse(node.direction);
    let mainCursor = mainReverse
      ? mainContent.start + mainContent.size - mainDistribution.leading
      : mainContent.start + mainDistribution.leading;
    for (let lineIndex = 0; lineIndex < line.itemIndexes.length; lineIndex += 1) {
      const sourceIndex = line.itemIndexes[lineIndex];
      const item = measured[sourceIndex];
      const mainMargins = mainMarginsOf(item.margin, node.direction);
      const crossMargins = crossMarginsOf(item.margin, axes.cross);
      const mainSlot = line.mainSlots[lineIndex];
      let mainSlotStart: number;
      if (mainReverse) {
        mainCursor -= mainMargins.start;
        mainCursor -= mainSlot;
        mainSlotStart = mainCursor;
        mainCursor -= mainMargins.end + mainGap + mainDistribution.between;
      } else {
        mainCursor += mainMargins.start;
        mainSlotStart = mainCursor;
        mainCursor += mainSlot + mainMargins.end + mainGap + mainDistribution.between;
      }
      const alignment = item.authored.alignSelf ?? node.alignItems;
      let finalResult = crossResults[sourceIndex];
      if (alignment === LayoutAlignment.Stretch) {
        const itemCrossSlot = Math.max(0, line.finalCrossSize - crossMargins.start - crossMargins.end);
        finalResult = requiredProbe(
          context,
          item.authored.child,
          physicalProposal(axes.main, exactProposal(mainSlot), exactProposal(itemCrossSlot)),
        );
      }
      const crossSlotSize = slotSizeOn(finalResult, axes.cross);
      const guideName =
        alignment === LayoutAlignment.LastBaseline
          ? LayoutAlignmentGuideName.LastBaseline
          : LayoutAlignmentGuideName.FirstBaseline;
      const guideOffset = structuralGuideOffset(finalResult, axes.cross, guideName).offset;
      const crossSlotStart = itemCrossSlotStart(line, crossSlotSize, crossMargins, alignment, guideOffset);
      const physicalSlot: LayoutRect =
        axes.main === 'x'
          ? { x: mainSlotStart, y: crossSlotStart, width: mainSlot, height: crossSlotSize }
          : { x: crossSlotStart, y: mainSlotStart, width: crossSlotSize, height: mainSlot };
      const mainTranslation = mainSlotStart - allocationStartOn(finalResult, axes.main);
      let crossTranslation: number;
      if (alignment === LayoutAlignment.FirstBaseline || alignment === LayoutAlignment.LastBaseline) {
        const baselineName =
          alignment === LayoutAlignment.FirstBaseline
            ? LayoutAlignmentGuideName.FirstBaseline
            : LayoutAlignmentGuideName.LastBaseline;
        const target =
          line.crossStart +
          (alignment === LayoutAlignment.FirstBaseline
            ? (line.firstTarget ?? 0)
            : (line.lastTarget ?? line.finalCrossSize));
        const guide = finalResult.alignmentGuides?.find(
          value => value.dimension === axes.cross && value.name === baselineName,
        );
        const source =
          guide?.position ??
          (alignment === LayoutAlignment.FirstBaseline
            ? allocationStartOn(finalResult, axes.cross)
            : allocationStartOn(finalResult, axes.cross) +
              (axes.cross === 'x' ? finalResult.allocationBounds.width : finalResult.allocationBounds.height));
        crossTranslation = target - source;
      } else {
        crossTranslation = alignAllocationInSlot(physicalSlot, finalResult.allocationBounds, axes.cross, alignment);
      }
      const translation =
        axes.main === 'x' ? { x: mainTranslation, y: crossTranslation } : { x: crossTranslation, y: mainTranslation };
      placedBySource[sourceIndex] = Object.freeze({ sourceIndex, result: finalResult, translation, alignment });
    }
  }
  const outputChildren = placedBySource.map(placed => {
    if (placed === undefined) throw new Error('FlexLayout failed to place an authored item');
    return context.replay(placed.result, {
      transforms: [{ kind: 'translate', x: placed.translation.x, y: placed.translation.y }],
    });
  });
  const scope = context.scope(
    node.overflow === LayoutOverflow.Clip ? { clip: layoutClipOf(allocation) } : {},
    outputChildren,
  );

  let alignmentGuides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  if (axes.main === 'x' && lineStates.length > 0) {
    const physicalLines = [...lineStates].sort((first, second) => first.crossStart - second.crossStart);
    const first = physicalLines[0];
    const last = physicalLines.at(-1)!;
    alignmentGuides = Object.freeze([
      Object.freeze({
        name: LayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: outgoingLineGuide(LayoutAlignmentGuideName.FirstBaseline, first, placedBySource),
      }),
      Object.freeze({
        name: LayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: outgoingLineGuide(LayoutAlignmentGuideName.LastBaseline, last, placedBySource),
      }),
    ]);
  }
  return {
    children: [scope],
    allocationBounds: allocation,
    ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
  };
};
