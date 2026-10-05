import type { LayoutChildResult } from '@retikz/core';
import { LayoutAlignmentGuideDimension, LayoutAlignmentGuideName } from '@retikz/core';

import type { CanonicalOverlayPlacement } from '../../resolve/overlay-layout';
import type { LayoutInsets, LayoutRect } from '../internal';
import { alignAllocationInSlot, compensatedLayoutSum, positionedLayoutSlotOf } from '../internal';
import type { LayoutAlignment } from '../shared';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';

/** Overlay 单个 profile 的结构输入 */
export type OverlayProfileItem = Readonly<{
  /** 对应作者输入数组的零基索引 */
  sourceIndex: number;
  /** 已解析的对齐式或坐标式放置策略 */
  placement: CanonicalOverlayPlacement;
  /** 子项的四边外边距 */
  margin: LayoutInsets;
  /** 在放置结果上应用的物理坐标偏移 */
  offset: Readonly<{
    /** 水平偏移量 */
    x: number;
    /** 垂直偏移量 */
    y: number;
  }>;
  /** 垂直方向对齐方式，可参与首末基线组 */
  alignment: LayoutAlignment;
  /** 该子项是否贡献容器的固有尺寸 */
  sizeParticipation: LayoutSizeParticipation;
  /** 用于水平尺寸贡献计算的测量结果 */
  xResult: LayoutChildResult;
  /** 用于垂直尺寸及基线计算的测量结果 */
  yResult: LayoutChildResult;
}>;

/** Overlay baseline group 的结构 ascent/descent */
export type OverlayBaselineMetric = Readonly<{
  /** 包含外边距的基线上方最大结构高度 */
  ascent: number;
  /** 包含外边距的基线下方最大结构高度 */
  descent: number;
}>;

/** Overlay 单个 intrinsic profile 的 content-box contribution */
export type OverlayProfile = Readonly<{
  /** 参与固有尺寸计算的内容总尺寸 */
  contentSize: Readonly<{
    /** 容器内容区域所需的宽度 */
    width: number;
    /** 容器内容区域所需的高度 */
    height: number;
  }>;
  /** 首基线对齐组的结构上下高度，无参与项时省略 */
  firstBaseline?: OverlayBaselineMetric;
  /** 末基线对齐组的结构上下高度，无参与项时省略 */
  lastBaseline?: OverlayBaselineMetric;
}>;

/** Overlay item placement 的纯求解输入 */
export type PlaceOverlayItemInput = Readonly<{
  /** 已解析的对齐式或坐标式放置策略 */
  placement: CanonicalOverlayPlacement;
  /** 容器中可用于放置子项的内容矩形 */
  content: LayoutRect;
  /** 子项的四边外边距 */
  margin: LayoutInsets;
  /** 应用到最终放置结果的物理坐标偏移 */
  offset: Readonly<{
    /** 水平偏移量 */
    x: number;
    /** 垂直偏移量 */
    y: number;
  }>;
  /** 子项在水平槽位中的对齐方式 */
  justify: LayoutAlignment;
  /** 子项在垂直槽位中的对齐方式 */
  align: LayoutAlignment;
  /** 用于真实分配边界定位的子项测量结果 */
  result: LayoutChildResult;
}>;

/** Overlay item 的无 margin slot 与真实 allocation translation */
export type PlacedOverlayGeometry = Readonly<{
  /** 已扣除外边距的结构槽位 */
  slot: LayoutRect;
  /** 把子项真实分配边界定位到槽位的平移量 */
  translation: Readonly<{
    /** 水平平移量 */
    x: number;
    /** 垂直平移量 */
    y: number;
  }>;
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
          ...positionedLayoutSlotOf({
            content: input.content,
            at: input.placement.at,
            anchor: input.placement.anchor,
            offset: input.offset,
            size: input.result.slotSize,
          }),
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
