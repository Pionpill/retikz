import { describe, expect, it } from 'vitest';

import { PaintSchema } from '../../src/schemas';

describe('PaintSchema 的 conicGradient 定义', () => {
  it('接受停止点、中心和角度', () => {
    const spec = {
      kind: 'conicGradient' as const,
      center: [0.5, 0.5] as [number, number],
      angle: -90,
      stops: [
        { offset: 0, color: '#ff0' },
        { offset: 0.5, color: '#06c' },
        { offset: 1, color: '#f30' },
      ],
    };

    expect(PaintSchema.parse(spec)).toEqual(spec);
  });

  it('拒绝非有限中心和角度', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'conicGradient',
        center: [0.5, Number.NaN],
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();

    expect(() =>
      PaintSchema.parse({
        kind: 'conicGradient',
        angle: Number.POSITIVE_INFINITY,
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
  });
});
