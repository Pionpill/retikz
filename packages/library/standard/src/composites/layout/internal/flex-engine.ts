import type { LayoutAlignmentValue, LayoutDistributionValue } from '../shared';

import { LayoutAlignment, LayoutDistribution } from '../shared';
import { compensatedLayoutSum, distributeWeightedLayoutSizes, layoutEpsilon } from './distribution';

/** Flex engine 支持的顺序流换行策略 */
export type FlexEngineWrapValue = 'nowrap' | 'wrap' | 'wrap-reverse';

/** Flex 主轴求解所需的稳定有限 item 输入 */
export type FlexMainItem = Readonly<{
  key: string;
  sourceIndex: number;
  flexBaseSlot: number;
  min: number;
  max?: number;
  grow: number;
  shrink: number;
  marginStart: number;
  marginEnd: number;
}>;

/** Flex line formation 的有限空间选项 */
export type FlexLineFormationOptions = Readonly<{
  wrap: FlexEngineWrapValue;
  availableMainSize?: number;
  gap: number;
}>;

/** 主轴 distribution 产生的起始偏移与附加 item 间距 */
export type FlexSpaceDistribution = Readonly<{
  leading: number;
  between: number;
}>;

/** Flex line 的 minimum / natural 主轴结构 profile */
export type FlexLineMainProfile = Readonly<{
  minimum: number;
  natural: number;
}>;

/** 参与单条 line 交叉轴求值的纯贡献输入 */
export type FlexCrossItem = Readonly<{
  slotSize: number;
  marginStart: number;
  marginEnd: number;
  alignment: LayoutAlignmentValue;
  firstBaselineOffset?: number;
  lastBaselineOffset?: number;
}>;

/** Flex line 的结构交叉轴指标 */
export type FlexLineCrossMetrics = Readonly<{
  size: number;
  firstTarget?: number;
  lastTarget?: number;
}>;

/** 已确定交叉轴尺寸的 line slot */
export type FlexCrossLine = Readonly<{
  crossStart: number;
  finalCrossSize: number;
  firstTarget?: number;
  lastTarget?: number;
}>;

/** 钳制 item 的初始 hypothetical main slot */
const hypotheticalMainSlotOf = (item: FlexMainItem): number =>
  item.max === undefined
    ? Math.max(item.flexBaseSlot, item.min)
    : Math.min(Math.max(item.flexBaseSlot, item.min), item.max);

/** 计算 item 参与 line formation 的 outer hypothetical main size */
const hypotheticalOuterMainSizeOf = (item: FlexMainItem): number =>
  compensatedLayoutSum([item.marginStart, hypotheticalMainSlotOf(item), item.marginEnd]);

/** 计算一条 Flex line 的 minimum / natural 主轴结构 profile */
export const resolveFlexLineMainProfile = (
  items: ReadonlyArray<FlexMainItem>,
  itemIndexes: ReadonlyArray<number>,
  gap: number,
): FlexLineMainProfile => {
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Flex line gap must be finite and non-negative');
  const gapTotal = gap * Math.max(0, itemIndexes.length - 1);
  const minimum = compensatedLayoutSum([
    ...itemIndexes.map(index => {
      const item = items[index];
      return compensatedLayoutSum([item.marginStart, item.min, item.marginEnd]);
    }),
    gapTotal,
  ]);
  const natural = compensatedLayoutSum([
    ...itemIndexes.map(index => hypotheticalOuterMainSizeOf(items[index])),
    gapTotal,
  ]);
  return Object.freeze({ minimum, natural });
};

/** 读取已形成 Flex lines 的最大主轴 profile */
export const resolveFlexLinesMainProfile = (lines: ReadonlyArray<FlexLineMainProfile>): FlexLineMainProfile =>
  Object.freeze({
    minimum: lines.length === 0 ? 0 : Math.max(...lines.map(line => line.minimum)),
    natural: lines.length === 0 ? 0 : Math.max(...lines.map(line => line.natural)),
  });

/** 汇总已形成 Flex lines 的 cross profile 与物理 line gap */
export const resolveFlexLinesCrossProfile = (
  lines: ReadonlyArray<FlexLineMainProfile>,
  gap: number,
): FlexLineMainProfile => {
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Flex line gap must be finite and non-negative');
  const gapTotal = gap * Math.max(0, lines.length - 1);
  return Object.freeze({
    minimum: compensatedLayoutSum([...lines.map(line => line.minimum), gapTotal]),
    natural: compensatedLayoutSum([...lines.map(line => line.natural), gapTotal]),
  });
};

/** 按 authored order 把 items 稳定分成 flex lines，反向仅由 placement 表达 */
export const formFlexLines = (
  items: ReadonlyArray<FlexMainItem>,
  options: FlexLineFormationOptions,
): ReadonlyArray<ReadonlyArray<number>> => {
  if (!Number.isFinite(options.gap) || options.gap < 0) {
    throw new Error('Flex line gap must be finite and non-negative');
  }
  if (
    options.availableMainSize !== undefined &&
    (!Number.isFinite(options.availableMainSize) || options.availableMainSize < 0)
  ) {
    throw new Error('Flex available main size must be finite and non-negative');
  }
  const traversal = items.map((_, index) => index);
  if (traversal.length === 0) return Object.freeze([]);
  if (options.wrap === 'nowrap' || options.availableMainSize === undefined) {
    return Object.freeze([Object.freeze(traversal)]);
  }

  const lines: Array<ReadonlyArray<number>> = [];
  let current: Array<number> = [];
  let used = 0;
  for (const index of traversal) {
    const outerSize = hypotheticalOuterMainSizeOf(items[index]);
    const candidate = current.length === 0 ? outerSize : compensatedLayoutSum([used, options.gap, outerSize]);
    if (
      current.length > 0 &&
      candidate > options.availableMainSize + layoutEpsilon(candidate, options.availableMainSize)
    ) {
      lines.push(Object.freeze(current));
      current = [index];
      used = outerSize;
    } else {
      current.push(index);
      used = candidate;
    }
  }
  lines.push(Object.freeze(current));
  return Object.freeze(lines);
};

/** 在单条 line 中执行有界 grow/shrink freeze 与重分配 */
export const resolveFlexLineMainSizes = (
  items: ReadonlyArray<FlexMainItem>,
  availableMainSize: number,
  gap: number,
): Readonly<{ values: ReadonlyArray<number>; remaining: number }> => {
  if (!Number.isFinite(availableMainSize) || availableMainSize < 0) {
    throw new Error('Flex available main size must be finite and non-negative');
  }
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Flex line gap must be finite and non-negative');
  const outerFixed = compensatedLayoutSum([
    ...items.flatMap(item => [item.marginStart, item.marginEnd]),
    gap * Math.max(0, items.length - 1),
  ]);
  if (!Number.isFinite(outerFixed)) throw new Error('Flex fixed outer main size must remain finite');
  const distributable = Math.max(0, availableMainSize - outerFixed);
  const hypothetical = items.map(hypotheticalMainSlotOf);
  const initialFree = distributable - compensatedLayoutSum(hypothetical);
  const growing = initialFree > layoutEpsilon(distributable, distributable - initialFree);
  const weighted = items.map((item, index) => ({
    base: hypothetical[index],
    min: item.min,
    ...(item.max === undefined ? {} : { max: item.max }),
    weight: growing ? item.grow : item.shrink * item.flexBaseSlot,
  }));
  const distributed = distributeWeightedLayoutSizes(weighted, distributable);
  return Object.freeze({
    values: distributed.values,
    remaining: availableMainSize - outerFixed - compensatedLayoutSum(distributed.values),
  });
};

/** 把 line 剩余 main space 解析为确定的起始偏移和附加 item 间距 */
export const resolveFlexSpaceDistribution = (
  distribution: LayoutDistributionValue,
  remaining: number,
  itemCount: number,
): FlexSpaceDistribution => {
  if (!Number.isFinite(remaining)) throw new Error('Flex remaining space must be finite');
  if (!Number.isInteger(itemCount) || itemCount < 0) throw new Error('Flex item count must be a non-negative integer');
  if (remaining <= 0) {
    if (distribution === LayoutDistribution.End) return Object.freeze({ leading: remaining, between: 0 });
    if (distribution === LayoutDistribution.Center) return Object.freeze({ leading: remaining / 2, between: 0 });
    return Object.freeze({ leading: 0, between: 0 });
  }
  if (distribution === LayoutDistribution.End) return Object.freeze({ leading: remaining, between: 0 });
  if (distribution === LayoutDistribution.Center) return Object.freeze({ leading: remaining / 2, between: 0 });
  if (distribution === LayoutDistribution.SpaceBetween && itemCount > 1) {
    return Object.freeze({ leading: 0, between: remaining / (itemCount - 1) });
  }
  if (distribution === LayoutDistribution.SpaceAround && itemCount > 0) {
    const between = remaining / itemCount;
    return Object.freeze({ leading: between / 2, between });
  }
  if (distribution === LayoutDistribution.SpaceEvenly && itemCount > 0) {
    const between = remaining / (itemCount + 1);
    return Object.freeze({ leading: between, between });
  }
  return Object.freeze({ leading: 0, between: 0 });
};

/** 计算一条 line 的结构 cross size 与 baseline target */
export const resolveFlexLineCrossMetrics = (items: ReadonlyArray<FlexCrossItem>): FlexLineCrossMetrics => {
  let ordinary = 0;
  let firstAscent = 0;
  let firstDescent = 0;
  let lastAscent = 0;
  let lastDescent = 0;
  let hasFirst = false;
  let hasLast = false;
  for (const item of items) {
    const offset = item.firstBaselineOffset ?? 0;
    const lastOffset = item.lastBaselineOffset ?? item.slotSize;
    ordinary = Math.max(ordinary, compensatedLayoutSum([item.marginStart, item.slotSize, item.marginEnd]));
    if (item.alignment === LayoutAlignment.FirstBaseline) {
      firstAscent = Math.max(firstAscent, item.marginStart + offset);
      firstDescent = Math.max(firstDescent, item.slotSize - offset + item.marginEnd);
      hasFirst = true;
    }
    if (item.alignment === LayoutAlignment.LastBaseline) {
      lastAscent = Math.max(lastAscent, item.marginStart + lastOffset);
      lastDescent = Math.max(lastDescent, item.slotSize - lastOffset + item.marginEnd);
      hasLast = true;
    }
  }
  const size = Math.max(ordinary, firstAscent + firstDescent, lastAscent + lastDescent);
  return Object.freeze({
    size,
    ...(hasFirst ? { firstTarget: firstAscent } : {}),
    ...(hasLast ? { lastTarget: size - lastDescent } : {}),
  });
};

/** 把 alignContent 剩余空间解析为 line slot 扩张、起始偏移与附加 gap */
export const resolveFlexLineDistribution = (
  distribution: LayoutDistributionValue,
  remaining: number,
  lineCount: number,
): Readonly<{ leading: number; between: number; stretch: number }> => {
  if (distribution === LayoutDistribution.Stretch && remaining > 0 && lineCount > 0) {
    return Object.freeze({ leading: 0, between: 0, stretch: remaining / lineCount });
  }
  const nonStretch = distribution === LayoutDistribution.Stretch ? LayoutDistribution.Start : distribution;
  return Object.freeze({ ...resolveFlexSpaceDistribution(nonStretch, remaining, lineCount), stretch: 0 });
};

/** 计算一个 alignment 在 line cross slot 中的 child slot 起点 */
export const resolveFlexItemCrossSlotStart = (
  line: FlexCrossLine,
  slotSize: number,
  margins: Readonly<{ start: number; end: number }>,
  alignment: LayoutAlignmentValue,
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
