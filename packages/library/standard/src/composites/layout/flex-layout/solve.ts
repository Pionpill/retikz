import type { FlexLayoutWrapValue, FlexMainDistributionValue } from './types';

import { compensatedLayoutSum, distributeWeightedLayoutSizes, layoutEpsilon } from '../internal';
import { LayoutDistribution } from '../shared';
import { FlexLayoutWrap } from './constants';

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
  wrap: FlexLayoutWrapValue;
  availableMainSize?: number;
  gap: number;
}>;

/** 主轴 distribution 产生的起始偏移与附加 item 间距 */
export type FlexSpaceDistribution = Readonly<{
  leading: number;
  between: number;
}>;

/** 钳制 item 的初始 hypothetical main slot */
const hypotheticalMainSlotOf = (item: FlexMainItem): number =>
  item.max === undefined
    ? Math.max(item.flexBaseSlot, item.min)
    : Math.min(Math.max(item.flexBaseSlot, item.min), item.max);

/** 计算 item 参与 line formation 的 outer hypothetical main size */
const hypotheticalOuterMainSizeOf = (item: FlexMainItem): number =>
  compensatedLayoutSum([item.marginStart, hypotheticalMainSlotOf(item), item.marginEnd]);

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
  if (options.wrap === FlexLayoutWrap.NoWrap || options.availableMainSize === undefined) {
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

/** 把 line 剩余 main space 解析为确定的起始偏移和附加间距 */
export const resolveFlexSpaceDistribution = (
  distribution: FlexMainDistributionValue,
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
