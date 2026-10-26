import { describe, expect, it } from 'vitest';

import { gradientLineFromAngle } from '../../src/shared/gradient';

describe('gradientLineFromAngle', () => {
  it('0deg 返回水平中心线', () => {
    expect(gradientLineFromAngle(0)).toEqual({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 });
  });

  it('缺失角度相当于 0deg', () => {
    expect(gradientLineFromAngle(undefined)).toEqual(gradientLineFromAngle(0));
  });

  it('90deg 返回垂直中心线', () => {
    const line = gradientLineFromAngle(90);

    expect(line.x1).toBeCloseTo(0.5);
    expect(line.x2).toBeCloseTo(0.5);
    expect(line.y1).toBeCloseTo(0);
    expect(line.y2).toBeCloseTo(1);
  });
});
