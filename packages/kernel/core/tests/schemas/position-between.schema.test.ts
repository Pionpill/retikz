import { describe, expect, it } from 'vitest';

import type { IRBetweenPosition } from '../../src/schemas';
import { BetweenPositionSchema } from '../../src/schemas';

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
