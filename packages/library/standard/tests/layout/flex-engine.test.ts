import { describe, expect, it } from 'vitest';

import { FlexLayoutWrap, LayoutAlignment, LayoutDistribution } from '../../src';
import {
  formFlexLines,
  resolveFlexItemCrossSlotStart,
  resolveFlexLineCrossMetrics,
  resolveFlexLineDistribution,
  resolveFlexLineMainProfile,
  resolveFlexLineMainSizes,
  resolveFlexLinesCrossProfile,
  resolveFlexLinesMainProfile,
  resolveFlexSpaceDistribution,
} from '../../src/composites/layout/internal/flex-engine';

const mainItem = (
  key: string,
  base: number,
  options: Partial<{
    min: number;
    max: number;
    grow: number;
    shrink: number;
    marginStart: number;
    marginEnd: number;
  }> = {},
) => ({
  key,
  sourceIndex: Number(key.replace(/\D/g, '')),
  flexBaseSlot: base,
  min: options.min ?? 0,
  ...(options.max === undefined ? {} : { max: options.max }),
  grow: options.grow ?? 0,
  shrink: options.shrink ?? 1,
  marginStart: options.marginStart ?? 0,
  marginEnd: options.marginEnd ?? 0,
});

describe('shared Flex engine', () => {
  it('resolves minimum and natural main profiles with margins and gaps', () => {
    const items = [
      mainItem('item-0', 20, { min: 10, marginStart: 2, marginEnd: 3 }),
      mainItem('item-1', 10, { min: 15, marginStart: 1, marginEnd: 2 }),
    ] as const;

    expect(resolveFlexLineMainProfile(items, [0, 1], 5)).toEqual({ minimum: 38, natural: 48 });
  });

  it('aggregates wrapped line profiles with max main and gapped cross extents', () => {
    const lines = [
      { minimum: 10, natural: 20 },
      { minimum: 30, natural: 25 },
    ] as const;

    expect(resolveFlexLinesMainProfile(lines)).toEqual({ minimum: 30, natural: 25 });
    expect(resolveFlexLinesCrossProfile(lines, 5)).toEqual({ minimum: 45, natural: 50 });
  });

  it('forms authored-order lines without creating an empty oversized line', () => {
    const items = [mainItem('item-0', 80), mainItem('item-1', 30), mainItem('item-2', 30)] as const;

    expect(formFlexLines(items, { wrap: FlexLayoutWrap.Wrap, availableMainSize: 60, gap: 5 })).toEqual([[0], [1], [2]]);
    expect(formFlexLines(items, { wrap: FlexLayoutWrap.NoWrap, availableMainSize: 60, gap: 5 })).toEqual([[0, 1, 2]]);
    expect(formFlexLines(items, { wrap: FlexLayoutWrap.Wrap, gap: 5 })).toEqual([[0, 1, 2]]);

    const fittingItems = [mainItem('item-0', 20), mainItem('item-1', 20), mainItem('item-2', 20)] as const;
    expect(formFlexLines(fittingItems, { wrap: FlexLayoutWrap.Wrap, availableMainSize: 45, gap: 5 })).toEqual([
      [0, 1],
      [2],
    ]);
    expect(fittingItems.map(item => item.sourceIndex)).toEqual([0, 1, 2]);
  });

  it('resolves grow, shrink, max and remaining space with the same numeric contract', () => {
    expect(
      resolveFlexLineMainSizes(
        [mainItem('item-0', 20, { grow: 1, max: 30 }), mainItem('item-1', 20, { grow: 3 })],
        100,
        0,
      ),
    ).toEqual({ values: [30, 70], remaining: 0 });
    expect(
      resolveFlexLineMainSizes(
        [mainItem('item-0', 40, { min: 30, shrink: 1 }), mainItem('item-1', 40, { shrink: 1 })],
        40,
        0,
      ),
    ).toEqual({ values: [30, 10], remaining: 0 });
    expect(
      resolveFlexLineMainSizes([mainItem('item-0', 10, { shrink: 0 }), mainItem('item-1', 10, { shrink: 0 })], 40, 0),
    ).toEqual({ values: [10, 10], remaining: 20 });
  });

  it('resolves distribution without inventing space-* gaps for negative remaining space', () => {
    expect(resolveFlexSpaceDistribution(LayoutDistribution.Center, 20, 2)).toEqual({ leading: 10, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceBetween, 20, 2)).toEqual({ leading: 0, between: 20 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceAround, 20, 2)).toEqual({ leading: 5, between: 10 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceEvenly, 20, 2)).toEqual({
      leading: 20 / 3,
      between: 20 / 3,
    });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.Start, -20, 2)).toEqual({ leading: 0, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.End, -20, 2)).toEqual({ leading: -20, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.Center, -20, 2)).toEqual({ leading: -10, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceBetween, -20, 2)).toEqual({
      leading: 0,
      between: 0,
    });
  });

  it('keeps margin and gap overflow in the remaining-space result', () => {
    const items = [
      mainItem('item-0', 10, { min: 10, marginStart: 20, marginEnd: 20 }),
      mainItem('item-1', 10, { min: 10, marginStart: 10, marginEnd: 10 }),
    ] as const;

    expect(resolveFlexLineMainSizes(items, 40, 5)).toEqual({ values: [10, 10], remaining: -45 });
  });

  it('computes cross-line size and baseline targets from contribution-only inputs', () => {
    const metrics = resolveFlexLineCrossMetrics([
      {
        slotSize: 10,
        marginStart: 2,
        marginEnd: 3,
        alignment: LayoutAlignment.FirstBaseline,
        firstBaselineOffset: 6,
      },
      {
        slotSize: 8,
        marginStart: 1,
        marginEnd: 1,
        alignment: LayoutAlignment.Start,
      },
    ]);

    expect(metrics).toEqual({ size: 15, firstTarget: 8 });
  });

  it('places cross slots with start, center, end and baseline alignment', () => {
    const line = { crossStart: 10, finalCrossSize: 30, firstTarget: 18, lastTarget: 32 } as const;

    expect(resolveFlexItemCrossSlotStart(line, 8, { start: 2, end: 3 }, LayoutAlignment.Start, 0)).toBe(12);
    expect(resolveFlexItemCrossSlotStart(line, 8, { start: 2, end: 3 }, LayoutAlignment.Center, 0)).toBe(20.5);
    expect(resolveFlexItemCrossSlotStart(line, 8, { start: 2, end: 3 }, LayoutAlignment.End, 0)).toBe(29);
    expect(resolveFlexItemCrossSlotStart(line, 8, { start: 2, end: 3 }, LayoutAlignment.FirstBaseline, 4)).toBe(24);
    expect(resolveFlexItemCrossSlotStart(line, 8, { start: 2, end: 3 }, LayoutAlignment.LastBaseline, 6)).toBe(36);
  });

  it('distributes cross lines with stretch and keeps start ordering stable', () => {
    expect(resolveFlexLineDistribution(LayoutDistribution.Stretch, 10, 2)).toEqual({
      leading: 0,
      between: 0,
      stretch: 5,
    });
    expect(resolveFlexLineDistribution(LayoutDistribution.SpaceAround, 10, 2)).toEqual({
      leading: 2.5,
      between: 5,
      stretch: 0,
    });
  });
});
