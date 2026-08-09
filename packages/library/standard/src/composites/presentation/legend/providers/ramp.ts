import type { LayoutChildResult } from '@retikz/core';
import type { LayoutRect } from '@retikz/layout/compose';

import { positionedLayoutSlotOf, unionLayoutArtifactRects } from '@retikz/layout/compose';

import type { IRLegendRampContent } from '../types';

import { LegendDirection } from '../constants';

/** 已取得 natural slot 的 ramp tick */
export type MeasuredLegendRampTick = Readonly<{
  /** tick 的稳定 authored identity */
  key: string;
  /** tick 在 authored ticks 数组中的来源索引 */
  sourceIndex: number;
  /** tick 沿 sample 主轴的归一化位置 */
  offset: number;
  /** tick label 的 natural probe 结果 */
  label?: LayoutChildResult;
}>;

/** normalized ramp tick 的结构 anchor 与可选 label slot */
export type LegendRampTickStructure = Readonly<{
  /** tick 的稳定 authored identity */
  key: string;
  /** tick 在 authored ticks 数组中的来源索引 */
  sourceIndex: number;
  /** tick 在 sample 边缘上的结构锚点 */
  anchor: Readonly<{ x: number; y: number }>;
  /** tick label 的结构 slot，缺少 label 时为 null */
  labelSlot: LayoutRect | null;
}>;

/** ramp sample 与 tick labels 的 normalized body-local structure */
export type LegendRampStructure = Readonly<{
  /** sample 与所有 tick label 的整体结构边界 */
  bounds: LayoutRect;
  /** ramp sample 的结构 slot */
  sampleSlot: LayoutRect;
  /** 按 authored order 保存的 tick 结构 */
  ticks: ReadonlyArray<LegendRampTickStructure>;
}>;

/** 使用 Overlay positioned 语义构造 ramp 的 body-local slot */
const positionedSlot = (x: number, y: number, width: number, height: number): LayoutRect =>
  positionedLayoutSlotOf({
    content: { x: 0, y: 0, width: 0, height: 0 },
    at: { x, y },
    anchor: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    size: { width, height },
  });

/** 建立 ramp provisional slots，并把负向端点 overhang 统一规范化到原点 */
export const createLegendRampStructure = (
  content: IRLegendRampContent,
  sample: LayoutChildResult,
  ticks: ReadonlyArray<MeasuredLegendRampTick>,
): LegendRampStructure => {
  const sampleWidth = sample.slotSize.width;
  const sampleHeight = sample.slotSize.height;
  const mainSize = content.direction === LegendDirection.Horizontal ? sampleWidth : sampleHeight;
  if (mainSize <= 0) {
    throw new Error('Legend ramp sample main-axis slot must be greater than zero');
  }

  const provisionalSample = positionedSlot(0, 0, sampleWidth, sampleHeight);
  const provisionalTicks = ticks.map((tick): LegendRampTickStructure => {
    const anchor =
      content.direction === LegendDirection.Horizontal
        ? Object.freeze({ x: tick.offset * sampleWidth, y: sampleHeight })
        : Object.freeze({ x: sampleWidth, y: tick.offset * sampleHeight });
    const labelSlot =
      tick.label === undefined
        ? null
        : content.direction === LegendDirection.Horizontal
          ? positionedSlot(
              anchor.x - tick.label.slotSize.width / 2,
              sampleHeight + content.sampleGap,
              tick.label.slotSize.width,
              tick.label.slotSize.height,
            )
          : positionedSlot(
              sampleWidth + content.sampleGap,
              anchor.y - tick.label.slotSize.height / 2,
              tick.label.slotSize.width,
              tick.label.slotSize.height,
            );
    return Object.freeze({ key: tick.key, sourceIndex: tick.sourceIndex, anchor, labelSlot });
  });
  const provisionalUnion = unionLayoutArtifactRects([
    provisionalSample,
    ...provisionalTicks.flatMap(tick => (tick.labelSlot === null ? [] : [tick.labelSlot])),
  ]);
  const translation = Object.freeze({ x: -provisionalUnion.x, y: -provisionalUnion.y });
  const translateRect = (rect: LayoutRect): LayoutRect =>
    Object.freeze({
      x: rect.x + translation.x,
      y: rect.y + translation.y,
      width: rect.width,
      height: rect.height,
    });
  const normalizedTicks = provisionalTicks.map(tick =>
    Object.freeze({
      ...tick,
      anchor: Object.freeze({ x: tick.anchor.x + translation.x, y: tick.anchor.y + translation.y }),
      labelSlot: tick.labelSlot === null ? null : translateRect(tick.labelSlot),
    }),
  );
  return Object.freeze({
    bounds: Object.freeze({ x: 0, y: 0, width: provisionalUnion.width, height: provisionalUnion.height }),
    sampleSlot: translateRect(provisionalSample),
    ticks: Object.freeze(normalizedTicks),
  });
};

/** 把 normalized ramp structure 整体平移到最终 body origin */
export const translateLegendRampStructure = (
  structure: LegendRampStructure,
  origin: Readonly<{ x: number; y: number }>,
): LegendRampStructure => {
  const translateRect = (rect: LayoutRect): LayoutRect =>
    Object.freeze({ x: rect.x + origin.x, y: rect.y + origin.y, width: rect.width, height: rect.height });
  return Object.freeze({
    bounds: translateRect(structure.bounds),
    sampleSlot: translateRect(structure.sampleSlot),
    ticks: Object.freeze(
      structure.ticks.map(tick =>
        Object.freeze({
          ...tick,
          anchor: Object.freeze({ x: tick.anchor.x + origin.x, y: tick.anchor.y + origin.y }),
          labelSlot: tick.labelSlot === null ? null : translateRect(tick.labelSlot),
        }),
      ),
    ),
  });
};
