import { describe, expect, it } from 'vitest';

import type { IRAnchorPosition, IRBetweenPosition } from '../../src/schemas';
import { AnchorPositionSchema, NodeSchema, BetweenPositionSchema } from '../../src/schemas';

describe('Node 锚点到锚点位置方案', () => {
  it('接受仅含 target.id 的最小形式', () => {
    const value: IRAnchorPosition = {
      kind: 'anchor',
      target: { id: 'target' },
    };

    expect(AnchorPositionSchema.parse(value)).toEqual(value);
    expect(
      NodeSchema.parse({
        type: 'node',
        position: value,
      }).position,
    ).toEqual(value);
  });

  it('kind 存在时只按 anchor 分支解析，不静默改写为其它 position', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: {
          kind: 'anchor',
          target: { id: 'target' },
          between: [
            [0, 0],
            [10, 10],
          ],
          fraction: 0.5,
        },
      }).success,
    ).toBe(false);
  });
});

describe('两端点之间按比例取点的端点形态', () => {
  it('端点为嵌套 between 接受（between 套 between）', () => {
    const valid: IRBetweenPosition = {
      between: [{ between: [{ id: 'A' }, { id: 'B' }], fraction: 0.5 }, { id: 'C' }],
      fraction: 0.5,
    };

    expect(BetweenPositionSchema.parse(valid)).toEqual(valid);
  });
});

describe('端点排除 path-relative 形态', () => {
  it('端点为 { relative } 偏移拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({
        between: [{ relative: [1, 1] }, { id: 'B' }],
        fraction: 0.5,
      }),
    ).toThrow();
  });
});
