import { describe, expect, it } from 'vitest';

import { gradientLineFromAngle } from '../../src/shared/gradient';

describe('gradientLineFromAngle', () => {
  it('0deg returns a horizontal center line', () => {
    expect(gradientLineFromAngle(0)).toEqual({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 });
  });

  it('missing angle is equivalent to 0deg', () => {
    expect(gradientLineFromAngle(undefined)).toEqual(gradientLineFromAngle(0));
  });

  it('90deg returns a vertical center line', () => {
    const line = gradientLineFromAngle(90);
    expect(line.x1).toBeCloseTo(0.5);
    expect(line.x2).toBeCloseTo(0.5);
    expect(line.y1).toBeCloseTo(0);
    expect(line.y2).toBeCloseTo(1);
  });
});
