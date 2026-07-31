import { describe, expect, it } from 'vitest';

import { FlexLayoutWrap, LayoutDistribution } from '../../src';
import {
  formFlexLines,
  resolveFlexLineMainSizes,
  resolveFlexSpaceDistribution,
} from '../../src/composites/flex-layout/solve';

const item = (
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

describe('FlexLayout main-axis pure solver', () => {
  it('forms stable wrap lines without an empty line for an oversized first item', () => {
    const items = [item('item-0', 80), item('item-1', 30), item('item-2', 30)] as const;

    expect(formFlexLines(items, { wrap: FlexLayoutWrap.Wrap, availableMainSize: 60, gap: 5 })).toEqual([[0], [1], [2]]);
    expect(formFlexLines(items, { wrap: FlexLayoutWrap.NoWrap, availableMainSize: 60, gap: 5 })).toEqual([[0, 1, 2]]);
    expect(formFlexLines(items, { wrap: FlexLayoutWrap.Wrap, gap: 5 })).toEqual([[0, 1, 2]]);
    expect(items.map(value => value.key)).toEqual(['item-0', 'item-1', 'item-2']);
  });

  it('keeps authored line formation while reverse remains a placement concern', () => {
    const items = [item('item-0', 20), item('item-1', 20), item('item-2', 20)] as const;

    expect(formFlexLines(items, { wrap: FlexLayoutWrap.Wrap, availableMainSize: 45, gap: 5 })).toEqual([[0, 1], [2]]);
    expect(items.map(value => value.sourceIndex)).toEqual([0, 1, 2]);
  });

  it('grows by factor, freezes at max and redistributes remaining space', () => {
    const items = [item('item-0', 20, { grow: 1, max: 30 }), item('item-1', 20, { grow: 3 })] as const;

    expect(resolveFlexLineMainSizes(items, 100, 0)).toEqual({ values: [30, 70], remaining: 0 });
  });

  it('shrinks by shrink times unclamped base and freezes at minimum', () => {
    const items = [item('item-0', 40, { min: 30, shrink: 1 }), item('item-1', 40, { min: 0, shrink: 1 })] as const;

    expect(resolveFlexLineMainSizes(items, 40, 0)).toEqual({ values: [30, 10], remaining: 0 });
  });

  it('keeps unavailable free space for justifyContent when all factors are zero', () => {
    const items = [item('item-0', 10, { grow: 0, shrink: 0 }), item('item-1', 10, { grow: 0, shrink: 0 })] as const;

    expect(resolveFlexLineMainSizes(items, 40, 0)).toEqual({ values: [10, 10], remaining: 20 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.Center, 20, 2)).toEqual({ leading: 10, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceBetween, 20, 2)).toEqual({ leading: 0, between: 20 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceAround, 20, 2)).toEqual({ leading: 5, between: 10 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceEvenly, 20, 2)).toEqual({
      leading: 20 / 3,
      between: 20 / 3,
    });
  });

  it('places negative overflow deterministically and never invents space-* gaps', () => {
    expect(resolveFlexSpaceDistribution(LayoutDistribution.Start, -20, 2)).toEqual({ leading: 0, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.End, -20, 2)).toEqual({ leading: -20, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.Center, -20, 2)).toEqual({ leading: -10, between: 0 });
    expect(resolveFlexSpaceDistribution(LayoutDistribution.SpaceBetween, -20, 2)).toEqual({ leading: 0, between: 0 });
  });

  it('keeps margin and gap overflow in the remaining-space result', () => {
    const items = [
      item('item-0', 10, { min: 10, marginStart: 20, marginEnd: 20 }),
      item('item-1', 10, { min: 10, marginStart: 10, marginEnd: 10 }),
    ] as const;

    expect(resolveFlexLineMainSizes(items, 40, 5)).toEqual({ values: [10, 10], remaining: -45 });
  });
});
