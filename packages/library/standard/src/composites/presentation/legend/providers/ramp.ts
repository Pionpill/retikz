import type { LayoutChildResult } from '@retikz/core';

import type { LayoutRect } from '../../../layout/internal';
import type { IRLegendRampContent } from '../types';

import { unionLayoutArtifactRects } from '../../../layout/internal';
import { LegendDirection } from '../constants';

/** 已取得 natural slot 的 ramp tick */
export type MeasuredLegendRampTick = Readonly<{
  key: string;
  sourceIndex: number;
  offset: number;
  label?: LayoutChildResult;
}>;

/** normalized ramp tick 的结构 anchor 与可选 label slot */
export type LegendRampTickStructure = Readonly<{
  key: string;
  sourceIndex: number;
  anchor: Readonly<{ x: number; y: number }>;
  labelSlot: LayoutRect | null;
}>;

/** ramp sample 与 tick labels 的 normalized body-local structure */
export type LegendRampStructure = Readonly<{
  bounds: LayoutRect;
  sampleSlot: LayoutRect;
  ticks: ReadonlyArray<LegendRampTickStructure>;
}>;

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

  const provisionalSample: LayoutRect = Object.freeze({ x: 0, y: 0, width: sampleWidth, height: sampleHeight });
  const provisionalTicks = ticks.map((tick): LegendRampTickStructure => {
    const anchor =
      content.direction === LegendDirection.Horizontal
        ? Object.freeze({ x: tick.offset * sampleWidth, y: sampleHeight })
        : Object.freeze({ x: sampleWidth, y: tick.offset * sampleHeight });
    const labelSlot =
      tick.label === undefined
        ? null
        : content.direction === LegendDirection.Horizontal
          ? Object.freeze({
              x: anchor.x - tick.label.slotSize.width / 2,
              y: sampleHeight + content.sampleGap,
              width: tick.label.slotSize.width,
              height: tick.label.slotSize.height,
            })
          : Object.freeze({
              x: sampleWidth + content.sampleGap,
              y: anchor.y - tick.label.slotSize.height / 2,
              width: tick.label.slotSize.width,
              height: tick.label.slotSize.height,
            });
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
