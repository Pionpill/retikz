import { describe, expect, it } from 'vitest';

import { PathCommandSchema } from '../../src/schemas';

describe('PathCommandSchema strict object behavior', () => {
  it('move command rejects unknown fields', () => {
    expect(PathCommandSchema.safeParse({ kind: 'move', to: [0, 0], typo: true }).success).toBe(false);
  });

  it('arc command rejects unknown fields', () => {
    expect(
      PathCommandSchema.safeParse({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
        sweep: 'clockwise',
      }).success,
    ).toBe(false);
  });

  it('close command rejects unknown fields', () => {
    expect(PathCommandSchema.safeParse({ kind: 'close', reason: 'done' }).success).toBe(false);
  });
});
