import { describe, expect, it } from 'vitest';

import {
  isAtPositionLike,
  isBetweenPositionLike,
  isNodeTargetLike,
  isOffsetPositionLike,
  isPolarPositionLike,
  isPositionTuple,
  isRelativeAccumulateTargetLike,
  isRelativeTargetLike,
} from '../../src/shared';

describe('共享位置谓词', () => {
  it('区分位置元组和极位置形状', () => {
    expect(isPositionTuple([1, 2])).toBe(true);
    expect(isPositionTuple([1, 2, 3])).toBe(false);
    expect(isPositionTuple(['1', 2])).toBe(false);

    expect(isPolarPositionLike({ angle: 30, radius: 10 })).toBe(true);
    expect(isPolarPositionLike({ angle: 30 })).toBe(false);
  });

  it('区分命名的相对、偏移、之间和节点目标形状', () => {
    expect(isAtPositionLike({ direction: 'top', of: 'A' })).toBe(true);
    expect(isAtPositionLike({ direction: 'center', of: 'A' })).toBe(false);

    expect(isOffsetPositionLike({ of: 'A', offset: [1, 2] })).toBe(true);
    expect(isOffsetPositionLike({ of: 'A', offset: [1] })).toBe(false);

    expect(isBetweenPositionLike({ between: ['A', [10, 20]], fraction: 0.5 })).toBe(true);
    expect(isBetweenPositionLike({ between: ['A'], fraction: 0.5 })).toBe(false);

    expect(isNodeTargetLike({ id: 'A' })).toBe(true);
    expect(isNodeTargetLike({ id: 1 })).toBe(false);
  });

  it('区分路径相对目标形状', () => {
    expect(isRelativeTargetLike({ relative: [1, 2] })).toBe(true);
    expect(isRelativeTargetLike({ relative: [1] })).toBe(false);

    expect(isRelativeAccumulateTargetLike({ relativeAccumulate: [1, 2] })).toBe(true);
    expect(isRelativeAccumulateTargetLike({ relativeAccumulate: [1, 2, 3] })).toBe(false);
  });
});
