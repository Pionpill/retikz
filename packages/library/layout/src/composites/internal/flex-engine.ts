import { RetikzLayoutError, RetikzLayoutErrorCode } from '../../errors';
import { LayoutAlignment, LayoutDistribution } from '../shared';
import { compensatedLayoutSum, distributeWeightedLayoutSizes, layoutEpsilon } from './distribution';

/** Flex engine 支持的顺序流换行策略 */
export type FlexEngineWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

/** Flex 主轴求解所需的稳定有限 item 输入 */
export type FlexMainItem = Readonly<{
  /** 布局项的稳定身份键 */
  key: string;
  /** 对应作者输入数组的零基索引 */
  sourceIndex: number;
  /** 应用弹性增减前的主轴槽位尺寸 */
  flexBaseSlot: number;
  /** 主轴槽位允许的最小尺寸 */
  min: number;
  /** 主轴槽位可选的最大尺寸 */
  max?: number;
  /** 主轴剩余空间的增长权重 */
  grow: number;
  /** 主轴空间不足时的收缩系数 */
  shrink: number;
  /** 主轴起始侧外边距 */
  marginStart: number;
  /** 主轴结束侧外边距 */
  marginEnd: number;
}>;

/** Flex line formation 的有限空间选项 */
export type FlexLineFormationOptions = Readonly<{
  /** 是否换行及交叉轴行序方向 */
  wrap: FlexEngineWrap;
  /** 有限的主轴可用空间，省略时不以宽度触发换行 */
  availableMainSize?: number;
  /** 同一行相邻项目之间的固定间距 */
  gap: number;
}>;

/** 主轴 distribution 产生的起始偏移与附加 item 间距 */
export type FlexSpaceDistribution = Readonly<{
  /** 首项之前分配的附加空间 */
  leading: number;
  /** 相邻项之间分配的附加空间，不包含固定 gap */
  between: number;
}>;

/** Flex line 的 minimum / natural 主轴结构 profile */
export type FlexLineMainProfile = Readonly<{
  /** 包含外边距和间距的最小主轴尺寸 */
  minimum: number;
  /** 包含外边距和间距的自然主轴尺寸 */
  natural: number;
}>;

/** 参与单条 line 交叉轴求值的纯贡献输入 */
export type FlexCrossItem = Readonly<{
  /** 当前子项的交叉轴槽位尺寸 */
  slotSize: number;
  /** 交叉轴起始侧外边距 */
  marginStart: number;
  /** 交叉轴结束侧外边距 */
  marginEnd: number;
  /** 子项在当前行内的交叉轴对齐方式 */
  alignment: LayoutAlignment;
  /** 首基线相对槽位起始边的偏移 */
  firstBaselineOffset?: number;
  /** 末基线相对槽位起始边的偏移 */
  lastBaselineOffset?: number;
}>;

/** Flex line 的结构交叉轴指标 */
export type FlexLineCrossMetrics = Readonly<{
  /** 满足子项尺寸与基线约束的行交叉轴尺寸 */
  size: number;
  /** 首基线对齐目标相对行起始边的偏移 */
  firstTarget?: number;
  /** 末基线对齐目标相对行起始边的偏移 */
  lastTarget?: number;
}>;

/** 已确定交叉轴尺寸的 line slot */
export type FlexCrossLine = Readonly<{
  /** 行槽位在交叉轴上的起始位置 */
  crossStart: number;
  /** 行槽位最终分配的交叉轴尺寸 */
  finalCrossSize: number;
  /** 该行首基线对齐目标的局部偏移 */
  firstTarget?: number;
  /** 该行末基线对齐目标的局部偏移 */
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
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex line gap must be finite and non-negative',
      details: { gap },
    });
  }

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
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex line gap must be finite and non-negative',
      details: { gap },
    });
  }

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
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex line gap must be finite and non-negative',
      details: { gap: options.gap },
    });
  }

  if (
    options.availableMainSize !== undefined &&
    (!Number.isFinite(options.availableMainSize) || options.availableMainSize < 0)
  ) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex available main size must be finite and non-negative',
      details: { availableMainSize: options.availableMainSize },
    });
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
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex available main size must be finite and non-negative',
      details: { availableMainSize },
    });
  }

  if (!Number.isFinite(gap) || gap < 0) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex line gap must be finite and non-negative',
      details: { gap },
    });
  }

  const outerFixed = compensatedLayoutSum([
    ...items.flatMap(item => [item.marginStart, item.marginEnd]),
    gap * Math.max(0, items.length - 1),
  ]);
  if (!Number.isFinite(outerFixed)) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex fixed outer main size must remain finite',
      details: { outerFixed },
    });
  }

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
  distribution: LayoutDistribution,
  remaining: number,
  itemCount: number,
): FlexSpaceDistribution => {
  if (!Number.isFinite(remaining)) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex remaining space must be finite',
      details: { remaining },
    });
  }

  if (!Number.isInteger(itemCount) || itemCount < 0) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: 'Flex item count must be a non-negative integer',
      details: { itemCount },
    });
  }

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
  distribution: LayoutDistribution,
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
  alignment: LayoutAlignment,
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
