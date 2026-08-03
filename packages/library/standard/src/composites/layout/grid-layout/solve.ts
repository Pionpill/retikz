import type { LayoutChildResult } from '@retikz/core';

import { LayoutAlignmentGuideDimension, LayoutAlignmentGuideName } from '@retikz/core';

import type { LayoutInsets, LayoutRect } from '../internal';
import type { LayoutAlignmentValue } from '../shared';
import type { IRGridTrack } from './types';

import { compensatedLayoutSum } from '../internal';
import { LayoutAlignment } from '../shared';

/** Grid track 在 container-local 坐标中的确定位置 */
export type PositionedGridTrack = Readonly<{
  start: number;
  size: number;
}>;

/** 单行 baseline 求解所需的 child 结构量 */
export type GridBaselineParticipant = Readonly<{
  sourceIndex: number;
  alignment: LayoutAlignmentValue;
  margin: LayoutInsets;
  result: LayoutChildResult;
}>;

/** 单行结构尺寸与 first/last baseline target */
export type GridRowMetrics = Readonly<{
  size: number;
  firstTarget?: number;
  lastTarget?: number;
}>;

/** 为隐式 extent 补齐 authored track 定义 */
export const materializeGridTracks = (
  explicit: ReadonlyArray<IRGridTrack>,
  implicit: IRGridTrack,
  count: number,
): ReadonlyArray<IRGridTrack> => {
  if (!Number.isSafeInteger(count) || count < explicit.length) {
    throw new Error('GridLayout resolved track count cannot be smaller than the explicit track count');
  }
  return Object.freeze(Array.from({ length: count }, (_, index) => explicit[index] ?? implicit));
};

/** 把已求解 track size 与分布间距转换为物理坐标 */
export const positionGridTracks = (
  start: number,
  sizes: ReadonlyArray<number>,
  leading: number,
  between: number,
): ReadonlyArray<PositionedGridTrack> => {
  let cursor = start + leading;
  return Object.freeze(
    sizes.map(size => {
      const positioned = Object.freeze({ start: cursor, size });
      cursor += size + between;
      return positioned;
    }),
  );
};

/** 读取一个连续 track span 覆盖的完整物理区间 */
export const gridSpanRange = (
  tracks: ReadonlyArray<PositionedGridTrack>,
  start: number,
  span: number,
): Readonly<{ start: number; size: number }> => {
  const first = tracks.at(start);
  const last = tracks.at(start + span - 1);
  if (first === undefined || last === undefined) throw new Error('GridLayout span is outside resolved tracks');
  return Object.freeze({ start: first.start, size: last.start + last.size - first.start });
};

/** 从 child result 读取纵轴无原点 slot size */
const slotHeightOf = (result: LayoutChildResult): number => result.slotSize.height;

/** 读取 child guide 相对结构 slot 起点的钳制 offset */
export const gridStructuralGuideOffset = (
  result: LayoutChildResult,
  name: 'first-baseline' | 'last-baseline',
): Readonly<{ offset: number; real: boolean }> => {
  const guide = result.alignmentGuides?.find(
    value => value.dimension === LayoutAlignmentGuideDimension.Y && value.name === name,
  );
  const slotHeight = slotHeightOf(result);
  if (guide === undefined) {
    return Object.freeze({
      offset: name === LayoutAlignmentGuideName.FirstBaseline ? 0 : slotHeight,
      real: false,
    });
  }
  return Object.freeze({
    offset: Math.min(Math.max(guide.position - result.allocationBounds.y, 0), slotHeight),
    real: true,
  });
};

/** 求解 single-row items 的结构高度与 baseline targets */
export const resolveGridRowMetrics = (participants: ReadonlyArray<GridBaselineParticipant>): GridRowMetrics => {
  let ordinary = 0;
  let firstAscent = 0;
  let firstDescent = 0;
  let lastAscent = 0;
  let lastDescent = 0;
  let hasFirst = false;
  let hasLast = false;
  for (const participant of participants) {
    const slotHeight = slotHeightOf(participant.result);
    ordinary = Math.max(
      ordinary,
      compensatedLayoutSum([participant.margin.top, slotHeight, participant.margin.bottom]),
    );
    if (participant.alignment === LayoutAlignment.FirstBaseline) {
      const guide = gridStructuralGuideOffset(participant.result, LayoutAlignmentGuideName.FirstBaseline);
      firstAscent = Math.max(firstAscent, participant.margin.top + guide.offset);
      firstDescent = Math.max(firstDescent, slotHeight - guide.offset + participant.margin.bottom);
      hasFirst = true;
    }
    if (participant.alignment === LayoutAlignment.LastBaseline) {
      const guide = gridStructuralGuideOffset(participant.result, LayoutAlignmentGuideName.LastBaseline);
      lastAscent = Math.max(lastAscent, participant.margin.top + guide.offset);
      lastDescent = Math.max(lastDescent, slotHeight - guide.offset + participant.margin.bottom);
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

/** 以内缩 margin 从 grid area 得到非负 child slot */
export const gridItemSlot = (area: LayoutRect, margin: LayoutInsets): LayoutRect =>
  Object.freeze({
    x: area.x + margin.left,
    y: area.y + margin.top,
    width: Math.max(0, area.width - margin.left - margin.right),
    height: Math.max(0, area.height - margin.top - margin.bottom),
  });
