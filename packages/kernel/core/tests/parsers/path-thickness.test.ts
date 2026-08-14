import { describe, expect, it } from 'vitest';

import { PathSchema, THICKNESS_TO_WIDTH } from '../../src';

describe('Path thickness vocabulary', () => {
  it.each([
    ['ultraThin', 0.25],
    ['veryThin', 0.5],
    ['thin', 1],
    ['semithick', 1.5],
    ['thick', 2],
    ['veryThick', 3],
    ['ultraThick', 4],
  ] as const)('thickness=%s -> strokeWidth=%s', (thickness, strokeWidth) => {
    expect(THICKNESS_TO_WIDTH[thickness]).toBe(strokeWidth);
  });

  it('PathSchema 不接受 raw thickness 字段', () => {
    const result = PathSchema.safeParse({
      type: 'path',
      thickness: 'thick',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });

    expect(result.success).toBe(false);
  });
});
