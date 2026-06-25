import { describe, expect, it } from 'vitest';
import { PaintSpecSchema } from '../../src/schemas';

describe('PaintSpecSchema conicGradient', () => {
  it('accepts stops, center and angle', () => {
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

    expect(PaintSpecSchema.parse(spec)).toEqual(spec);
  });

  it('rejects non-finite center and angle', () => {
    expect(() =>
      PaintSpecSchema.parse({
        kind: 'conicGradient',
        center: [0.5, Number.NaN],
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();

    expect(() =>
      PaintSpecSchema.parse({
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
