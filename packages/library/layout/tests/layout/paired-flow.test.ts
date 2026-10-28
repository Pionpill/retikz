import { describe, expect, it } from 'vitest';

import { LayoutAlignment } from '../../src';
import { resolvePairedFlowPlan } from '../../src/composites/internal';

const size = (width: number, height: number) => ({ width, height });

const item = (
  key: string,
  primaryMinimum: Readonly<{ width: number; height: number }>,
  primaryNatural: Readonly<{ width: number; height: number }>,
  secondaryMinimum?: Readonly<{ width: number; height: number }>,
  secondaryNatural = secondaryMinimum,
) => ({
  key,
  sourceIndex: Number(key.replace(/\D/g, '')),
  primary: { minimum: primaryMinimum, natural: primaryNatural },
  ...(secondaryMinimum === undefined ? {} : { secondary: { minimum: secondaryMinimum, natural: secondaryNatural! } }),
});

describe('共享配对流布局方案', () => {
  it('在水平 Flex 流内使用网格对，并在 y 上对齐次要子级', () => {
    const plan = resolvePairedFlowPlan({
      direction: 'horizontal',
      wrap: 'nowrap',
      gap: { row: 0, column: 4 },
      pairGap: 2,
      secondaryAlignment: LayoutAlignment.Center,
      items: [item('item-0', size(10, 20), size(10, 20), size(5, 10))],
    });

    expect(plan.bounds).toEqual({ x: 0, y: 0, width: 17, height: 20 });
    expect(plan.slots).toEqual([
      {
        sourceIndex: 0,
        primary: { x: 0, y: 0, width: 10, height: 20 },
        secondary: { x: 12, y: 5, width: 5, height: 10 },
      },
    ]);
  });

  it('在每个包裹的垂直 Flex 列内使用共享主 Grid 轨道', () => {
    const plan = resolvePairedFlowPlan({
      direction: 'vertical',
      wrap: 'nowrap',
      gap: { row: 5, column: 8 },
      pairGap: 3,
      secondaryAlignment: LayoutAlignment.Center,
      items: [
        item('item-0', size(10, 10), size(10, 10), size(20, 8)),
        item('item-1', size(30, 6), size(30, 6), size(10, 12)),
      ],
    });

    expect(plan.bounds).toEqual({ x: 0, y: 0, width: 53, height: 27 });
    expect(plan.slots).toEqual([
      {
        sourceIndex: 0,
        primary: { x: 0, y: 0, width: 30, height: 10 },
        secondary: { x: 33, y: 1, width: 20, height: 8 },
      },
      {
        sourceIndex: 1,
        primary: { x: 0, y: 15, width: 30, height: 6 },
        secondary: { x: 33, y: 12, width: 10, height: 12 },
      },
    ]);
  });

  it('当主要预算有限时，形成一个超大的垂直项目作为自己的列', () => {
    const plan = resolvePairedFlowPlan({
      direction: 'vertical',
      wrap: 'wrap',
      availableMainSize: 10,
      gap: { row: 2, column: 6 },
      pairGap: 1,
      secondaryAlignment: LayoutAlignment.Start,
      items: [item('item-0', size(8, 20), size(8, 20)), item('item-1', size(4, 4), size(4, 4))],
    });

    expect(plan.lines.map(line => line.itemIndexes)).toEqual([[0], [1]]);
    expect(plan.slots[1]?.primary.x).toBe(14);
  });

  it('当次要子项不存在时，不会创建次要间隙', () => {
    const plan = resolvePairedFlowPlan({
      direction: 'horizontal',
      wrap: 'nowrap',
      gap: { row: 0, column: 8 },
      pairGap: 100,
      secondaryAlignment: LayoutAlignment.End,
      items: [item('item-0', size(10, 6), size(10, 6))],
    });

    expect(plan.bounds).toEqual({ x: 0, y: 0, width: 10, height: 6 });
    expect(plan.slots[0]?.secondary).toBeNull();
  });
});
