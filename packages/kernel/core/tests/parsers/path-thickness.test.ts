import { describe, expect, it } from 'vitest';

import { parsePathThickness, PathSchema, THICKNESS_TO_WIDTH } from '../../src';

describe('parsePathThickness', () => {
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
    expect(parsePathThickness({ thickness })).toEqual({ strokeWidth });
  });

  it('显式 strokeWidth 优先于 thickness', () => {
    expect(parsePathThickness({ thickness: 'thick', strokeWidth: 7 })).toEqual({ strokeWidth: 7 });
  });

  it('缺省时不写 strokeWidth，让 compile 使用默认值', () => {
    expect(parsePathThickness({})).toEqual({});
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
