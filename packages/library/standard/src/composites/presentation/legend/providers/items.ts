import type { LayoutChildResult } from '@retikz/core';

import type { LayoutRect } from '../../../layout/internal';
import type { IRLegendItem, IRLegendItemsContent } from '../types';

import { compensatedLayoutSum } from '../../../layout/internal';
import { LegendDirection, LegendSampleAlignment, LegendWrap } from '../constants';

/** Legend child 在 minimum 与 natural probe 下的结构结果 */
export type MeasuredLegendChild = Readonly<{
  minimum: LayoutChildResult;
  natural: LayoutChildResult;
}>;

/** 已取得结构 contribution 的离散 Legend item */
export type MeasuredLegendItem = Readonly<{
  authored: IRLegendItem;
  sourceIndex: number;
  sample: MeasuredLegendChild;
  label?: MeasuredLegendChild;
}>;

/** 已按 authored order 形成的一条 row 或 column */
export type LegendItemLine = Readonly<{
  itemIndexes: ReadonlyArray<number>;
  minimumMainSize: number;
  naturalMainSize: number;
  minimumCrossSize: number;
  naturalCrossSize: number;
  sampleColumnSize: number;
}>;

/** 单个 item 的结构 sample / label slot */
export type LegendItemSlots = Readonly<{
  sourceIndex: number;
  sample: LayoutRect;
  label: LayoutRect | null;
}>;

/** items form 的确定结构 placement */
export type LegendItemsPlacement = Readonly<{
  bodyBounds: LayoutRect | null;
  slots: ReadonlyArray<LegendItemSlots>;
}>;

type PhysicalSize = Readonly<{ width: number; height: number }>;

/** 从 child result 读取无原点结构 slot 尺寸 */
const sizeOf = (result: LayoutChildResult): PhysicalSize => result.slotSize;

/** 读取 item 在指定 probe 模式下的自身自然外框尺寸 */
const itemOuterSize = (item: MeasuredLegendItem, mode: 'minimum' | 'natural', sampleGap: number): PhysicalSize => {
  const sample = sizeOf(item.sample[mode]);
  const label = item.label === undefined ? undefined : sizeOf(item.label[mode]);
  return {
    width: compensatedLayoutSum([sample.width, ...(label === undefined ? [] : [sampleGap, label.width])]),
    height: Math.max(sample.height, label?.height ?? 0),
  };
};

/** 计算一条 row / column 的 minimum 与 natural 双 profile */
const profileLine = (
  content: IRLegendItemsContent,
  items: ReadonlyArray<MeasuredLegendItem>,
  itemIndexes: ReadonlyArray<number>,
): LegendItemLine => {
  const minimum = itemIndexes.map(index => itemOuterSize(items[index], 'minimum', content.sampleGap));
  const natural = itemIndexes.map(index => itemOuterSize(items[index], 'natural', content.sampleGap));
  if (content.direction === LegendDirection.Horizontal) {
    return Object.freeze({
      itemIndexes: Object.freeze([...itemIndexes]),
      minimumMainSize: compensatedLayoutSum([
        ...minimum.map(size => size.width),
        content.gap.column * Math.max(0, itemIndexes.length - 1),
      ]),
      naturalMainSize: compensatedLayoutSum([
        ...natural.map(size => size.width),
        content.gap.column * Math.max(0, itemIndexes.length - 1),
      ]),
      minimumCrossSize: minimum.length === 0 ? 0 : Math.max(...minimum.map(size => size.height)),
      naturalCrossSize: natural.length === 0 ? 0 : Math.max(...natural.map(size => size.height)),
      sampleColumnSize: 0,
    });
  }

  const minimumSampleColumn =
    itemIndexes.length === 0 ? 0 : Math.max(...itemIndexes.map(index => sizeOf(items[index].sample.minimum).width));
  const naturalSampleColumn =
    itemIndexes.length === 0 ? 0 : Math.max(...itemIndexes.map(index => sizeOf(items[index].sample.natural).width));
  const minimumCrossSize = itemIndexes.reduce((maximum, index) => {
    const label = items[index].label;
    const labelWidth = label === undefined ? 0 : sizeOf(label.minimum).width;
    return Math.max(maximum, minimumSampleColumn + (label === undefined ? 0 : content.sampleGap + labelWidth));
  }, 0);
  const naturalCrossSize = itemIndexes.reduce((maximum, index) => {
    const label = items[index].label;
    const labelWidth = label === undefined ? 0 : sizeOf(label.natural).width;
    return Math.max(maximum, naturalSampleColumn + (label === undefined ? 0 : content.sampleGap + labelWidth));
  }, 0);
  return Object.freeze({
    itemIndexes: Object.freeze([...itemIndexes]),
    minimumMainSize: compensatedLayoutSum([
      ...minimum.map(size => size.height),
      content.gap.row * Math.max(0, itemIndexes.length - 1),
    ]),
    naturalMainSize: compensatedLayoutSum([
      ...natural.map(size => size.height),
      content.gap.row * Math.max(0, itemIndexes.length - 1),
    ]),
    minimumCrossSize,
    naturalCrossSize,
    sampleColumnSize: naturalSampleColumn,
  });
};

/** 计算未换行 items 在 main 轴上的 intrinsic 双 profile */
export const intrinsicItemsMainProfile = (
  content: IRLegendItemsContent,
  items: ReadonlyArray<MeasuredLegendItem>,
): Readonly<{ minimum: number; natural: number }> => {
  if (items.length === 0) return Object.freeze({ minimum: 0, natural: 0 });
  const unwrapped = profileLine(
    content,
    items,
    items.map((_, index) => index),
  );
  if (content.wrap === LegendWrap.NoWrap) {
    return Object.freeze({ minimum: unwrapped.minimumMainSize, natural: unwrapped.naturalMainSize });
  }
  const minimum = Math.max(
    ...items.map(item => {
      const size = itemOuterSize(item, 'minimum', content.sampleGap);
      return content.direction === LegendDirection.Horizontal ? size.width : size.height;
    }),
  );
  return Object.freeze({ minimum, natural: unwrapped.naturalMainSize });
};

/** 用 preliminary content budget 执行一次 authored-order greedy line formation */
export const formLegendItemLines = (
  content: IRLegendItemsContent,
  items: ReadonlyArray<MeasuredLegendItem>,
  budget: number,
): ReadonlyArray<LegendItemLine> => {
  if (items.length === 0) return Object.freeze([]);
  if (content.wrap === LegendWrap.NoWrap) {
    return Object.freeze([
      profileLine(
        content,
        items,
        items.map((_, index) => index),
      ),
    ]);
  }

  const gap = content.direction === LegendDirection.Horizontal ? content.gap.column : content.gap.row;
  const lines: Array<Array<number>> = [];
  let current: Array<number> = [];
  let used = 0;
  items.forEach((item, index) => {
    const natural = itemOuterSize(item, 'natural', content.sampleGap);
    const mainSize = content.direction === LegendDirection.Horizontal ? natural.width : natural.height;
    const candidate = current.length === 0 ? mainSize : compensatedLayoutSum([used, gap, mainSize]);
    if (current.length > 0 && candidate > budget) {
      lines.push(current);
      current = [index];
      used = mainSize;
    } else {
      current.push(index);
      used = candidate;
    }
  });
  if (current.length > 0) lines.push(current);
  return Object.freeze(lines.map(indexes => profileLine(content, items, indexes)));
};

/** 读取形成后 lines 在 main 轴上的最大双 profile */
export const formedLinesMainProfile = (
  lines: ReadonlyArray<LegendItemLine>,
): Readonly<{ minimum: number; natural: number }> =>
  Object.freeze({
    minimum: lines.length === 0 ? 0 : Math.max(...lines.map(line => line.minimumMainSize)),
    natural: lines.length === 0 ? 0 : Math.max(...lines.map(line => line.naturalMainSize)),
  });

/** 读取形成后 lines 在 cross 轴上的完整双 profile */
export const formedLinesCrossProfile = (
  content: IRLegendItemsContent,
  lines: ReadonlyArray<LegendItemLine>,
): Readonly<{ minimum: number; natural: number }> => {
  const gap = content.direction === LegendDirection.Horizontal ? content.gap.row : content.gap.column;
  const gapTotal = gap * Math.max(0, lines.length - 1);
  return Object.freeze({
    minimum: compensatedLayoutSum([...lines.map(line => line.minimumCrossSize), gapTotal]),
    natural: compensatedLayoutSum([...lines.map(line => line.naturalCrossSize), gapTotal]),
  });
};

/** 沿物理 y 轴把较小 sample / label slot 放入 item 高度 */
const alignedY = (start: number, available: number, size: number, alignment: IRLegendItemsContent['sampleAlign']) => {
  if (alignment === LegendSampleAlignment.End) return start + available - size;
  if (alignment === LegendSampleAlignment.Center) return start + (available - size) / 2;
  return start;
};

/** 把 formed lines 解析为 final structural sample / label slots */
export const placeLegendItems = (
  content: IRLegendItemsContent,
  items: ReadonlyArray<MeasuredLegendItem>,
  lines: ReadonlyArray<LegendItemLine>,
  origin: Readonly<{ x: number; y: number }>,
): LegendItemsPlacement => {
  if (lines.length === 0) return Object.freeze({ bodyBounds: null, slots: Object.freeze([]) });
  const bySource: Array<LegendItemSlots | undefined> = Array.from({ length: items.length });

  if (content.direction === LegendDirection.Horizontal) {
    let rowY = origin.y;
    for (const line of lines) {
      let itemX = origin.x;
      for (const sourceIndex of line.itemIndexes) {
        const item = items[sourceIndex];
        const sample = sizeOf(item.sample.natural);
        const label = item.label === undefined ? undefined : sizeOf(item.label.natural);
        const itemHeight = Math.max(sample.height, label?.height ?? 0);
        const sampleSlot = Object.freeze({
          x: itemX,
          y: alignedY(rowY, itemHeight, sample.height, content.sampleAlign),
          width: sample.width,
          height: sample.height,
        });
        const labelSlot =
          label === undefined
            ? null
            : Object.freeze({
                x: itemX + sample.width + content.sampleGap,
                y: alignedY(rowY, itemHeight, label.height, content.sampleAlign),
                width: label.width,
                height: label.height,
              });
        bySource[sourceIndex] = Object.freeze({ sourceIndex, sample: sampleSlot, label: labelSlot });
        itemX += sample.width + (label === undefined ? 0 : content.sampleGap + label.width) + content.gap.column;
      }
      rowY += line.naturalCrossSize + content.gap.row;
    }
  } else {
    let columnX = origin.x;
    for (const line of lines) {
      let itemY = origin.y;
      for (const sourceIndex of line.itemIndexes) {
        const item = items[sourceIndex];
        const sample = sizeOf(item.sample.natural);
        const label = item.label === undefined ? undefined : sizeOf(item.label.natural);
        const itemHeight = Math.max(sample.height, label?.height ?? 0);
        const sampleSlot = Object.freeze({
          x: columnX,
          y: alignedY(itemY, itemHeight, sample.height, content.sampleAlign),
          width: line.sampleColumnSize,
          height: sample.height,
        });
        const labelSlot =
          label === undefined
            ? null
            : Object.freeze({
                x: columnX + line.sampleColumnSize + content.sampleGap,
                y: alignedY(itemY, itemHeight, label.height, content.sampleAlign),
                width: label.width,
                height: label.height,
              });
        bySource[sourceIndex] = Object.freeze({ sourceIndex, sample: sampleSlot, label: labelSlot });
        itemY += itemHeight + content.gap.row;
      }
      columnX += line.naturalCrossSize + content.gap.column;
    }
  }

  const slots = Object.freeze(
    bySource.map(value => {
      if (value === undefined) throw new Error('Legend failed to place an authored item');
      return value;
    }),
  );
  const width =
    content.direction === LegendDirection.Horizontal
      ? formedLinesMainProfile(lines).natural
      : formedLinesCrossProfile(content, lines).natural;
  const height =
    content.direction === LegendDirection.Horizontal
      ? formedLinesCrossProfile(content, lines).natural
      : formedLinesMainProfile(lines).natural;
  return Object.freeze({
    bodyBounds: Object.freeze({ x: origin.x, y: origin.y, width, height }),
    slots,
  });
};
