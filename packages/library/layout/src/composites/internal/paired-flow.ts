import type { GridTrackConstraint } from '../grid-layout/tracks';
import type { IRGridTrack } from '../grid-layout/types';
import type { LayoutAlignmentValue } from '../shared';
import type { FlexMainItem } from './flex-engine';
import type { LayoutRect } from './geometry';

import { solveGridTracks } from '../grid-layout/tracks';
import { LayoutAlignment, LayoutDistribution } from '../shared';
import { compensatedLayoutSum } from './distribution';
import {
  formFlexLines,
  resolveFlexItemCrossSlotStart,
  resolveFlexLineCrossMetrics,
  resolveFlexLineMainProfile,
  resolveFlexLinesCrossProfile,
  resolveFlexLinesMainProfile,
} from './flex-engine';

/** 一个已取得 minimum/natural 结构尺寸的布局 child */
export type PairedFlowMeasuredChild = Readonly<{
  minimum: Readonly<{ width: number; height: number }>;
  natural: Readonly<{ width: number; height: number }>;
}>;

/** 由主 child 与可选次 child 组成的顺序流 item */
export type PairedFlowItem = Readonly<{
  key: string;
  sourceIndex: number;
  primary: PairedFlowMeasuredChild;
  secondary?: PairedFlowMeasuredChild;
}>;

/** paired flow 的物理方向 */
export type PairedFlowDirection = 'horizontal' | 'vertical';

/** paired flow 的换行策略 */
export type PairedFlowWrap = 'nowrap' | 'wrap';

/** paired flow 支持的次 child 交叉轴对齐方式 */
export type PairedFlowAlignment = Extract<LayoutAlignmentValue, 'start' | 'center' | 'end'>;

/** paired flow 的输入参数 */
export type PairedFlowOptions = Readonly<{
  direction: PairedFlowDirection;
  wrap: PairedFlowWrap;
  gap: Readonly<{ row: number; column: number }>;
  pairGap: number;
  primaryAlignment?: PairedFlowAlignment;
  secondaryAlignment: PairedFlowAlignment;
  secondaryAlignmentBasis?: 'primary' | 'pair';
  availableMainSize?: number;
  origin?: Readonly<{ x: number; y: number }>;
}>;

/** paired flow 一条物理 line 的结构结果 */
export type PairedFlowLine = Readonly<{
  itemIndexes: ReadonlyArray<number>;
  minimumMainSize: number;
  naturalMainSize: number;
  minimumCrossSize: number;
  naturalCrossSize: number;
  primaryTrackSize: number;
}>;

/** paired flow 一个 item 的 primary/secondary 最终 slot */
export type PairedFlowSlot = Readonly<{
  sourceIndex: number;
  primary: LayoutRect;
  secondary: LayoutRect | null;
}>;

/** paired flow 的纯布局结果，不包含 replay token 或 Scene 输出 */
export type PairedFlowPlan = Readonly<{
  bounds: LayoutRect;
  lines: ReadonlyArray<PairedFlowLine>;
  slots: ReadonlyArray<PairedFlowSlot>;
  minimumMainSize: number;
  naturalMainSize: number;
  minimumCrossSize: number;
  naturalCrossSize: number;
}>;

/** 将 paired flow 的纯分配结果平移到新的结构 origin */
export const translatePairedFlowPlan = (
  plan: PairedFlowPlan,
  origin: Readonly<{ x: number; y: number }>,
): PairedFlowPlan => {
  const translation = {
    x: origin.x - plan.bounds.x,
    y: origin.y - plan.bounds.y,
  };
  const translate = (rect: LayoutRect): LayoutRect =>
    Object.freeze({
      x: rect.x + translation.x,
      y: rect.y + translation.y,
      width: rect.width,
      height: rect.height,
    });
  const slots = Object.freeze(
    plan.slots.map(
      (slot): PairedFlowSlot =>
        Object.freeze({
          sourceIndex: slot.sourceIndex,
          primary: translate(slot.primary),
          secondary: slot.secondary === null ? null : translate(slot.secondary),
        }),
    ),
  );
  return Object.freeze({
    ...plan,
    bounds: translate(plan.bounds),
    slots,
  });
};

type PairProfile = Readonly<{
  width: number;
  height: number;
  primaryWidth: number;
  secondaryWidth: number;
}>;

const contentTrack = (): IRGridTrack => ({ kind: 'content', mode: 'natural' });

const trackProfileOf = (
  items: ReadonlyArray<PairedFlowItem>,
  indexes: ReadonlyArray<number>,
  pairGap: number,
  mode: 'minimum' | 'natural',
): ReadonlyArray<number> => {
  const hasSecondary = indexes.some(index => items[index].secondary !== undefined);
  const tracks = Array.from({ length: hasSecondary ? 2 : 1 }, contentTrack);
  const constraints: Array<GridTrackConstraint> = [];
  indexes.forEach(index => {
    const item = items[index];
    const primary = item.primary[mode];
    constraints.push({ start: 0, span: 1, minimum: primary.width, natural: primary.width });
    if (item.secondary !== undefined) {
      const secondary = item.secondary[mode];
      constraints.push({ start: 1, span: 1, minimum: secondary.width, natural: secondary.width });
    }
  });
  const solved = solveGridTracks(tracks, constraints, {
    gap: hasSecondary ? pairGap : 0,
    distribution: LayoutDistribution.Start,
  });
  return mode === 'minimum' ? solved.minimumProfile : solved.naturalProfile;
};

const pairProfileOf = (item: PairedFlowItem, pairGap: number, mode: 'minimum' | 'natural'): PairProfile => {
  const primary = item.primary[mode];
  const secondary = item.secondary?.[mode];
  const tracks = trackProfileOf([item], [0], pairGap, mode);
  const primaryWidth = tracks[0] ?? primary.width;
  const secondaryWidth = secondary === undefined ? 0 : (tracks[1] ?? secondary.width);
  const height = resolveFlexLineCrossMetrics([
    {
      slotSize: primary.height,
      marginStart: 0,
      marginEnd: 0,
      alignment: LayoutAlignment.Start,
    },
    ...(secondary === undefined
      ? []
      : [
          {
            slotSize: secondary.height,
            marginStart: 0,
            marginEnd: 0,
            alignment: LayoutAlignment.Start,
          },
        ]),
  ]).size;
  return Object.freeze({
    width: compensatedLayoutSum([primaryWidth, ...(secondary === undefined ? [] : [pairGap, secondaryWidth])]),
    height,
    primaryWidth,
    secondaryWidth,
  });
};

const mainItemsOf = (
  items: ReadonlyArray<PairedFlowItem>,
  direction: PairedFlowDirection,
  pairGap: number,
): ReadonlyArray<FlexMainItem> =>
  Object.freeze(
    items.map((item, sourceIndex) => {
      const minimum = pairProfileOf(item, pairGap, 'minimum');
      const natural = pairProfileOf(item, pairGap, 'natural');
      const mainMinimum = direction === 'horizontal' ? minimum.width : minimum.height;
      const mainNatural = direction === 'horizontal' ? natural.width : natural.height;
      return Object.freeze({
        key: item.key,
        sourceIndex,
        flexBaseSlot: mainNatural,
        min: mainMinimum,
        grow: 0,
        shrink: 0,
        marginStart: 0,
        marginEnd: 0,
      });
    }),
  );

/** 读取 paired flow 在未确定换行预算前的主轴 minimum/natural profile */
export const resolvePairedFlowIntrinsicMainProfile = (
  options: PairedFlowOptions & Readonly<{ items: ReadonlyArray<PairedFlowItem> }>,
): Readonly<{ minimum: number; natural: number }> => {
  if (!Number.isFinite(options.pairGap) || options.pairGap < 0) {
    throw new Error('Paired flow pair gap must be finite and non-negative');
  }
  const mainGap = options.direction === 'horizontal' ? options.gap.column : options.gap.row;
  const mainItems = mainItemsOf(options.items, options.direction, options.pairGap);
  const indexes = options.items.map((_, index) => index);
  const unwrapped = resolveFlexLineMainProfile(mainItems, indexes, mainGap);
  if (options.wrap === 'nowrap' || indexes.length === 0) return Object.freeze(unwrapped);
  return Object.freeze({
    minimum: Math.max(...indexes.map(index => resolveFlexLineMainProfile(mainItems, [index], 0).minimum)),
    natural: unwrapped.natural,
  });
};

const lineCrossProfileOf = (
  items: ReadonlyArray<PairedFlowItem>,
  indexes: ReadonlyArray<number>,
  direction: PairedFlowDirection,
  pairGap: number,
  mode: 'minimum' | 'natural',
): Readonly<{ size: number; primaryTrackSize: number }> => {
  if (direction === 'horizontal') {
    return {
      size: resolveFlexLineCrossMetrics(
        indexes.map(index => ({
          slotSize: pairProfileOf(items[index], pairGap, mode).height,
          marginStart: 0,
          marginEnd: 0,
          alignment: LayoutAlignment.Start,
        })),
      ).size,
      primaryTrackSize: 0,
    };
  }
  const tracks = trackProfileOf(items, indexes, pairGap, mode);
  return {
    size: compensatedLayoutSum([...tracks, ...(tracks.length > 1 ? [pairGap] : [])]),
    primaryTrackSize: tracks[0] ?? 0,
  };
};

const profileLine = (
  items: ReadonlyArray<PairedFlowItem>,
  mainItems: ReadonlyArray<FlexMainItem>,
  indexes: ReadonlyArray<number>,
  options: PairedFlowOptions,
): PairedFlowLine => {
  const mainGap = options.direction === 'horizontal' ? options.gap.column : options.gap.row;
  const minimumCross = lineCrossProfileOf(items, indexes, options.direction, options.pairGap, 'minimum');
  const naturalCross = lineCrossProfileOf(items, indexes, options.direction, options.pairGap, 'natural');
  const mainProfile = resolveFlexLineMainProfile(mainItems, indexes, mainGap);
  return Object.freeze({
    itemIndexes: Object.freeze([...indexes]),
    minimumMainSize: mainProfile.minimum,
    naturalMainSize: mainProfile.natural,
    minimumCrossSize: minimumCross.size,
    naturalCrossSize: naturalCross.size,
    primaryTrackSize: naturalCross.primaryTrackSize,
  });
};

const pairCrossStart = (start: number, size: number, available: number, alignment: PairedFlowAlignment): number =>
  resolveFlexItemCrossSlotStart(
    { crossStart: start, finalCrossSize: available },
    size,
    { start: 0, end: 0 },
    alignment,
    0,
  );

/** 使用 Flex line formation 与 Grid pair tracks 解析两段式顺序流 */
export const resolvePairedFlowPlan = (
  options: PairedFlowOptions & Readonly<{ items: ReadonlyArray<PairedFlowItem> }>,
): PairedFlowPlan => {
  if (!Number.isFinite(options.pairGap) || options.pairGap < 0) {
    throw new Error('Paired flow pair gap must be finite and non-negative');
  }
  const origin = options.origin ?? { x: 0, y: 0 };
  const mainGap = options.direction === 'horizontal' ? options.gap.column : options.gap.row;
  const mainItems = mainItemsOf(options.items, options.direction, options.pairGap);
  const primaryAlignment = options.primaryAlignment ?? LayoutAlignment.Start;
  const secondaryAlignmentBasis = options.secondaryAlignmentBasis ?? 'primary';
  const lineIndexes = formFlexLines(mainItems, {
    wrap: options.wrap,
    gap: mainGap,
    ...(options.availableMainSize === undefined ? {} : { availableMainSize: options.availableMainSize }),
  });
  const lines = Object.freeze(lineIndexes.map(indexes => profileLine(options.items, mainItems, indexes, options)));
  const slotsBySource: Array<PairedFlowSlot | undefined> = Array.from({ length: options.items.length });

  if (options.direction === 'horizontal') {
    let rowY = origin.y;
    for (const line of lines) {
      let itemX = origin.x;
      for (const sourceIndex of line.itemIndexes) {
        const item = options.items[sourceIndex];
        const primary = item.primary.natural;
        const secondary = item.secondary?.natural;
        const pair = pairProfileOf(item, options.pairGap, 'natural');
        const primarySlot = Object.freeze({
          x: itemX,
          y: pairCrossStart(rowY, primary.height, pair.height, primaryAlignment),
          width: primary.width,
          height: primary.height,
        });
        const secondarySlot =
          secondary === undefined
            ? null
            : Object.freeze({
                x: itemX + pair.primaryWidth + options.pairGap,
                y: pairCrossStart(
                  rowY,
                  secondary.height,
                  secondaryAlignmentBasis === 'pair' ? pair.height : primary.height,
                  options.secondaryAlignment,
                ),
                width: secondary.width,
                height: secondary.height,
              });
        slotsBySource[sourceIndex] = Object.freeze({ sourceIndex, primary: primarySlot, secondary: secondarySlot });
        itemX += pair.width + mainGap;
      }
      rowY += line.naturalCrossSize + options.gap.row;
    }
  } else {
    let columnX = origin.x;
    for (const line of lines) {
      let itemY = origin.y;
      for (const sourceIndex of line.itemIndexes) {
        const item = options.items[sourceIndex];
        const primary = item.primary.natural;
        const secondary = item.secondary?.natural;
        const pair = pairProfileOf(item, options.pairGap, 'natural');
        const primarySlot = Object.freeze({
          x: columnX,
          y: pairCrossStart(itemY, primary.height, pair.height, primaryAlignment),
          width: line.primaryTrackSize,
          height: primary.height,
        });
        const secondarySlot =
          secondary === undefined
            ? null
            : Object.freeze({
                x: columnX + line.primaryTrackSize + options.pairGap,
                y: pairCrossStart(
                  itemY,
                  secondary.height,
                  secondaryAlignmentBasis === 'pair' ? pair.height : primary.height,
                  options.secondaryAlignment,
                ),
                width: secondary.width,
                height: secondary.height,
              });
        slotsBySource[sourceIndex] = Object.freeze({ sourceIndex, primary: primarySlot, secondary: secondarySlot });
        itemY += pair.height + options.gap.row;
      }
      columnX += line.naturalCrossSize + options.gap.column;
    }
  }

  const slots = Object.freeze(
    slotsBySource.map(slot => {
      if (slot === undefined) throw new Error('Paired flow failed to place an authored item');
      return slot;
    }),
  );
  const mainProfile = resolveFlexLinesMainProfile(
    lines.map(line => ({ minimum: line.minimumMainSize, natural: line.naturalMainSize })),
  );
  const crossGap = options.direction === 'horizontal' ? options.gap.row : options.gap.column;
  const crossProfile = resolveFlexLinesCrossProfile(
    lines.map(line => ({ minimum: line.minimumCrossSize, natural: line.naturalCrossSize })),
    crossGap,
  );
  const width = options.direction === 'horizontal' ? mainProfile.natural : crossProfile.natural;
  const height = options.direction === 'horizontal' ? crossProfile.natural : mainProfile.natural;
  return Object.freeze({
    bounds: Object.freeze({ x: origin.x, y: origin.y, width, height }),
    lines,
    slots,
    minimumMainSize: mainProfile.minimum,
    naturalMainSize: mainProfile.natural,
    minimumCrossSize: crossProfile.minimum,
    naturalCrossSize: crossProfile.natural,
  });
};
