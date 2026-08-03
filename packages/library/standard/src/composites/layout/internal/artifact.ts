import type { LayoutChildResult } from '@retikz/core';

import { LayoutAlignmentGuideDimension } from '@retikz/core';

import type {
  LayoutAlignmentValue,
  LayoutArtifactAlignmentGuide,
  LayoutArtifactContainer,
  LayoutArtifactItemBase,
  LayoutArtifactRect,
  LayoutOverflowValue,
  LayoutSpacingArtifact,
} from '../shared';
import type { LayoutInsets, LayoutRect } from './geometry';

import { LayoutAlignment, LayoutOverflow, LayoutSpacingKind } from '../shared';
import { layoutEpsilon } from './distribution';
import { outsetLayoutRect } from './geometry';

/** Layout item artifact 基础字段的构造输入 */
export type CreateLayoutArtifactItemInput = Readonly<{
  key: string;
  sourceIndex: number;
  margin: LayoutInsets;
  slotBounds: LayoutRect;
  result: LayoutChildResult;
  translation: Readonly<{ x: number; y: number }>;
  containerAllocation: LayoutRect;
  overflow: LayoutOverflowValue;
  alignmentGuide?: LayoutArtifactAlignmentGuide;
}>;

/** 在 resolved spacing 数组中追加一个正主轴长度 segment */
export const appendLayoutSpacing = (
  target: Array<LayoutSpacingArtifact>,
  input: Readonly<{
    kind: LayoutSpacingArtifact['kind'];
    axis: LayoutSpacingArtifact['axis'];
    mainStart: number;
    mainSize: number;
    crossStart: number;
    crossSize: number;
  }>,
): void => {
  if (input.mainSize <= 0) return;
  target.push(
    Object.freeze({
      kind: input.kind,
      axis: input.axis,
      bounds: Object.freeze(
        input.axis === LayoutAlignmentGuideDimension.X
          ? { x: input.mainStart, y: input.crossStart, width: input.mainSize, height: input.crossSize }
          : { x: input.crossStart, y: input.mainStart, width: input.crossSize, height: input.mainSize },
      ),
    }),
  );
};

/** 把相邻物理 box 间隔拆成居中的固定 gap 与两侧 distributed segment */
export const appendLayoutSpacingInterval = (
  target: Array<LayoutSpacingArtifact>,
  input: Readonly<{
    axis: LayoutSpacingArtifact['axis'];
    start: number;
    end: number;
    gap: number;
    crossStart: number;
    crossSize: number;
  }>,
): void => {
  const size = input.end - input.start;
  if (size <= 0) return;
  const gapSize = Math.min(input.gap, size);
  const gapStart = input.start + (size - gapSize) / 2;
  appendLayoutSpacing(target, {
    kind: LayoutSpacingKind.Distributed,
    axis: input.axis,
    mainStart: input.start,
    mainSize: gapStart - input.start,
    crossStart: input.crossStart,
    crossSize: input.crossSize,
  });
  appendLayoutSpacing(target, {
    kind: LayoutSpacingKind.Gap,
    axis: input.axis,
    mainStart: gapStart,
    mainSize: gapSize,
    crossStart: input.crossStart,
    crossSize: input.crossSize,
  });
  appendLayoutSpacing(target, {
    kind: LayoutSpacingKind.Distributed,
    axis: input.axis,
    mainStart: gapStart + gapSize,
    mainSize: input.end - gapStart - gapSize,
    crossStart: input.crossStart,
    crossSize: input.crossSize,
  });
};

/** 按 axis、主坐标、正交坐标与 kind 返回 canonical spacing 顺序 */
export const sortLayoutSpacing = (spacing: ReadonlyArray<LayoutSpacingArtifact>): Array<LayoutSpacingArtifact> =>
  [...spacing].sort((first, second) => {
    if (first.axis !== second.axis) return first.axis === LayoutAlignmentGuideDimension.X ? -1 : 1;
    const firstMain = first.axis === LayoutAlignmentGuideDimension.X ? first.bounds.x : first.bounds.y;
    const secondMain = second.axis === LayoutAlignmentGuideDimension.X ? second.bounds.x : second.bounds.y;
    if (firstMain !== secondMain) return firstMain - secondMain;
    const firstCross = first.axis === LayoutAlignmentGuideDimension.X ? first.bounds.y : first.bounds.x;
    const secondCross = second.axis === LayoutAlignmentGuideDimension.X ? second.bounds.y : second.bounds.x;
    if (firstCross !== secondCross) return firstCross - secondCross;
    if (first.kind === second.kind) return 0;
    return first.kind === LayoutSpacingKind.Gap ? -1 : 1;
  });

/** 把 child-local rect 平移到 container allocation coordinate */
export const translateLayoutRect = (
  rect: LayoutRect,
  translation: Readonly<{ x: number; y: number }>,
): LayoutArtifactRect =>
  Object.freeze({
    x: rect.x + translation.x,
    y: rect.y + translation.y,
    width: rect.width,
    height: rect.height,
  });

/** 求一组 container-local rect 的确定 union，空集返回 canonical zero */
export const unionLayoutArtifactRects = (rects: ReadonlyArray<LayoutArtifactRect>): LayoutArtifactRect => {
  if (rects.length === 0) return Object.freeze({ x: 0, y: 0, width: 0, height: 0 });
  const minX = Math.min(...rects.map(rect => rect.x));
  const minY = Math.min(...rects.map(rect => rect.y));
  const maxX = Math.max(...rects.map(rect => rect.x + rect.width));
  const maxY = Math.max(...rects.map(rect => rect.y + rect.height));
  return Object.freeze({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
};

/** 求两个 rect 的正面积交集，无正面积时返回 null */
export const intersectLayoutArtifactRects = (
  first: LayoutArtifactRect,
  second: LayoutArtifactRect,
): LayoutArtifactRect | null => {
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const maxX = Math.min(first.x + first.width, second.x + second.width);
  const maxY = Math.min(first.y + first.height, second.y + second.height);
  if (maxX <= x || maxY <= y) return null;
  return Object.freeze({ x, y, width: maxX - x, height: maxY - y });
};

/** 在一个 available rect 内按 alignment 放置 proposal 解析后的真实 slot */
export const alignResolvedLayoutSlot = (
  available: LayoutRect,
  result: LayoutChildResult,
  horizontal: LayoutAlignmentValue,
  vertical: LayoutAlignmentValue,
): LayoutRect => {
  const alignedStart = (
    start: number,
    availableSize: number,
    slotSize: number,
    alignment: LayoutAlignmentValue,
  ): number => {
    if (alignment === LayoutAlignment.End || alignment === LayoutAlignment.LastBaseline) {
      return start + availableSize - slotSize;
    }
    if (alignment === LayoutAlignment.Center) return start + (availableSize - slotSize) / 2;
    return start;
  };
  return Object.freeze({
    x: alignedStart(available.x, available.width, result.slotSize.width, horizontal),
    y: alignedStart(available.y, available.height, result.slotSize.height, vertical),
    width: result.slotSize.width,
    height: result.slotSize.height,
  });
};

/** 读取实际采用的纵轴 baseline guide 或 allocation edge fallback */
export const createLayoutArtifactAlignmentGuide = (
  result: LayoutChildResult,
  translation: Readonly<{ x: number; y: number }>,
  name: 'first-baseline' | 'last-baseline',
  dimension: 'x' | 'y' = LayoutAlignmentGuideDimension.Y,
): LayoutArtifactAlignmentGuide => {
  const guide = result.alignmentGuides?.find(value => value.dimension === dimension && value.name === name);
  const allocationStart = dimension === 'x' ? result.allocationBounds.x : result.allocationBounds.y;
  const allocationSize = dimension === 'x' ? result.allocationBounds.width : result.allocationBounds.height;
  const fallbackPosition = name === 'first-baseline' ? allocationStart : allocationStart + allocationSize;
  return Object.freeze({
    name,
    position: (guide?.position ?? fallbackPosition) + (dimension === 'x' ? translation.x : translation.y),
    fallback: guide === undefined,
  });
};

/** 从 final slot、真实 bounds 与 overflow policy 构造共享 item artifact */
export const createLayoutArtifactItem = (input: CreateLayoutArtifactItemInput): LayoutArtifactItemBase => {
  const allocationBounds = translateLayoutRect(input.result.allocationBounds, input.translation);
  const visualBounds = translateLayoutRect(input.result.visualBounds, input.translation);
  const outsideAxis = (rect: LayoutArtifactRect, slot: LayoutRect, axis: 'x' | 'y'): boolean => {
    const rectStart = axis === 'x' ? rect.x : rect.y;
    const rectSize = axis === 'x' ? rect.width : rect.height;
    const slotStart = axis === 'x' ? slot.x : slot.y;
    const slotSize = axis === 'x' ? slot.width : slot.height;
    const epsilon = Math.max(layoutEpsilon(rectStart, slotStart), layoutEpsilon(rectSize, slotSize));
    return rectStart < slotStart - epsilon || rectStart + rectSize > slotStart + slotSize + epsilon;
  };
  const outsideAxisExactly = (rect: LayoutArtifactRect, slot: LayoutRect, axis: 'x' | 'y'): boolean => {
    const rectStart = axis === 'x' ? rect.x : rect.y;
    const rectSize = axis === 'x' ? rect.width : rect.height;
    const slotStart = axis === 'x' ? slot.x : slot.y;
    const slotSize = axis === 'x' ? slot.width : slot.height;
    return rectStart < slotStart || rectStart + rectSize > slotStart + slotSize;
  };
  const allocationOverflow = Object.freeze({
    x: outsideAxis(allocationBounds, input.slotBounds, 'x'),
    y: outsideAxis(allocationBounds, input.slotBounds, 'y'),
  });
  const visualOverflow = Object.freeze({
    x: outsideAxis(visualBounds, input.slotBounds, 'x'),
    y: outsideAxis(visualBounds, input.slotBounds, 'y'),
  });
  const hasPositiveVisualArea = visualBounds.width > 0 && visualBounds.height > 0;
  const visibleBounds = !hasPositiveVisualArea
    ? null
    : input.overflow === LayoutOverflow.Visible
      ? visualBounds
      : intersectLayoutArtifactRects(visualBounds, input.containerAllocation);
  const clipped =
    input.overflow === LayoutOverflow.Clip &&
    hasPositiveVisualArea &&
    (outsideAxisExactly(visualBounds, input.containerAllocation, 'x') ||
      outsideAxisExactly(visualBounds, input.containerAllocation, 'y'));
  return Object.freeze({
    key: input.key,
    sourceIndex: input.sourceIndex,
    marginBounds: outsetLayoutRect(input.slotBounds, input.margin),
    slotBounds: input.slotBounds,
    allocationBounds,
    visualBounds,
    visibleBounds,
    translation: input.translation,
    overflow: Object.freeze({ allocation: allocationOverflow, visual: visualOverflow, clipped }),
    ...(input.alignmentGuide === undefined ? {} : { alignmentGuide: input.alignmentGuide }),
  });
};

/** 从 item artifacts 汇总 container geometry 与可见区域 */
export const createLayoutArtifactContainer = (
  allocationBounds: LayoutRect,
  contentBounds: LayoutRect,
  items: ReadonlyArray<LayoutArtifactItemBase>,
): LayoutArtifactContainer => {
  const visualBounds = unionLayoutArtifactRects(items.map(item => item.visualBounds));
  const visibleItemBounds = items.flatMap(item => (item.visibleBounds === null ? [] : [item.visibleBounds]));
  const visibleBounds = visibleItemBounds.length === 0 ? null : unionLayoutArtifactRects(visibleItemBounds);
  return Object.freeze({ allocationBounds, contentBounds, visualBounds, visibleBounds });
};
