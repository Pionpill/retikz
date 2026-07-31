import type { LayoutChildResult } from '@retikz/core';

import { LayoutAlignmentGuideDimension, LayoutAlignmentGuideName } from '@retikz/core';

import type { LayoutAlignmentValue } from '../shared/layout';
import type { LayoutInsets, LayoutRect } from '../shared/layout/internal';
import type { IROverlayPlacement, LayoutSizeParticipationValue } from './types';

import { alignAllocationInSlot, compensatedLayoutSum } from '../shared/layout/internal';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';

/** Overlay 单个 profile 的结构输入 */
export type OverlayProfileItem = Readonly<{
  sourceIndex: number;
  placement: IROverlayPlacement;
  margin: LayoutInsets;
  offset: Readonly<{ x: number; y: number }>;
  alignment: LayoutAlignmentValue;
  sizeParticipation: LayoutSizeParticipationValue;
  xResult: LayoutChildResult;
  yResult: LayoutChildResult;
}>;

/** Overlay baseline group 的结构 ascent/descent */
export type OverlayBaselineMetric = Readonly<{
  ascent: number;
  descent: number;
}>;

/** Overlay 单个 intrinsic profile 的 content-box contribution */
export type OverlayProfile = Readonly<{
  contentSize: Readonly<{ width: number; height: number }>;
  firstBaseline?: OverlayBaselineMetric;
  lastBaseline?: OverlayBaselineMetric;
}>;

/** Overlay item placement 的纯求解输入 */
export type PlaceOverlayItemInput = Readonly<{
  placement: IROverlayPlacement;
  content: LayoutRect;
  margin: LayoutInsets;
  offset: Readonly<{ x: number; y: number }>;
  justify: LayoutAlignmentValue;
  align: LayoutAlignmentValue;
  result: LayoutChildResult;
}>;

/** Overlay item 的无 margin slot 与真实 allocation translation */
export type PlacedOverlayGeometry = Readonly<{
  slot: LayoutRect;
  translation: Readonly<{ x: number; y: number }>;
}>;

/** 读取 child guide 相对结构 slot 起点的钳制 offset */
export const overlayStructuralGuideOffset = (
  result: LayoutChildResult,
  name: 'first-baseline' | 'last-baseline',
): Readonly<{ offset: number; real: boolean }> => {
  const guide = result.alignmentGuides?.find(
    value => value.dimension === LayoutAlignmentGuideDimension.Y && value.name === name,
  );
  const slotHeight = result.slotSize.height;
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

/** 合并 baseline participant 的最大 ascent/descent */
const baselineMetricOf = (
  items: ReadonlyArray<OverlayProfileItem>,
  name: 'first-baseline' | 'last-baseline',
): OverlayBaselineMetric | undefined => {
  const participants = items.filter(
    item => item.placement.kind === OverlayPlacementKind.Aligned && item.alignment === name,
  );
  if (participants.length === 0) return undefined;
  let ascent = 0;
  let descent = 0;
  for (const item of participants) {
    const guide = overlayStructuralGuideOffset(item.yResult, name);
    ascent = Math.max(ascent, item.margin.top + guide.offset);
    descent = Math.max(descent, item.yResult.slotSize.height - guide.offset + item.margin.bottom);
  }
  return Object.freeze({ ascent, descent });
};

/** 求解 Overlay 单个 minimum/natural profile 的有限 content contribution */
export const resolveOverlayProfile = (items: ReadonlyArray<OverlayProfileItem>): OverlayProfile => {
  const included = items.filter(item => item.sizeParticipation === LayoutSizeParticipation.Include);
  let width = 0;
  let height = 0;
  for (const item of included) {
    if (item.placement.kind === OverlayPlacementKind.Aligned) {
      width = Math.max(width, compensatedLayoutSum([item.margin.left, item.xResult.slotSize.width, item.margin.right]));
      height = Math.max(
        height,
        compensatedLayoutSum([item.margin.top, item.yResult.slotSize.height, item.margin.bottom]),
      );
      continue;
    }
    const slotWidth = item.xResult.slotSize.width;
    const slotHeight = item.yResult.slotSize.height;
    const slotX = item.placement.at.x + item.offset.x - item.placement.anchor.x * slotWidth;
    const slotY = item.placement.at.y + item.offset.y - item.placement.anchor.y * slotHeight;
    width = Math.max(width, slotX + slotWidth + item.margin.right, 0);
    height = Math.max(height, slotY + slotHeight + item.margin.bottom, 0);
  }
  const firstBaseline = baselineMetricOf(included, LayoutAlignmentGuideName.FirstBaseline);
  const lastBaseline = baselineMetricOf(included, LayoutAlignmentGuideName.LastBaseline);
  if (firstBaseline !== undefined) height = Math.max(height, firstBaseline.ascent + firstBaseline.descent);
  if (lastBaseline !== undefined) height = Math.max(height, lastBaseline.ascent + lastBaseline.descent);
  return Object.freeze({
    contentSize: Object.freeze({ width, height }),
    ...(firstBaseline === undefined ? {} : { firstBaseline }),
    ...(lastBaseline === undefined ? {} : { lastBaseline }),
  });
};

/** 求解 aligned content slot 或 positioned anchored slot 的真实 allocation translation */
export const placeOverlayItem = (input: PlaceOverlayItemInput): PlacedOverlayGeometry => {
  const slot: LayoutRect =
    input.placement.kind === OverlayPlacementKind.Aligned
      ? Object.freeze({
          x: input.content.x + input.margin.left,
          y: input.content.y + input.margin.top,
          width: Math.max(0, input.content.width - input.margin.left - input.margin.right),
          height: Math.max(0, input.content.height - input.margin.top - input.margin.bottom),
        })
      : Object.freeze({
          x:
            input.content.x +
            input.placement.at.x +
            input.offset.x -
            input.placement.anchor.x * input.result.slotSize.width,
          y:
            input.content.y +
            input.placement.at.y +
            input.offset.y -
            input.placement.anchor.y * input.result.slotSize.height,
          width: input.result.slotSize.width,
          height: input.result.slotSize.height,
        });
  const base = Object.freeze({
    x: alignAllocationInSlot(slot, input.result.allocationBounds, 'x', input.justify),
    y: alignAllocationInSlot(slot, input.result.allocationBounds, 'y', input.align),
  });
  return Object.freeze({
    slot,
    translation:
      input.placement.kind === OverlayPlacementKind.Aligned
        ? Object.freeze({ x: base.x + input.offset.x, y: base.y + input.offset.y })
        : base,
  });
};

/** 按 zIndex 与 sourceIndex 返回稳定 paint order */
export const sortOverlayPaintOrder = (
  items: ReadonlyArray<Readonly<{ sourceIndex: number; zIndex: number }>>,
): ReadonlyArray<number> =>
  Object.freeze(
    [...items]
      .sort((first, second) => first.zIndex - second.zIndex || first.sourceIndex - second.sourceIndex)
      .map(item => item.sourceIndex),
  );
