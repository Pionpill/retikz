import { describe, expect, it } from 'vitest';

import { DiagramFrameSchema, DiagramPresentationSchema, DiagramThemeSchema } from '../../src/foundation';

describe('Diagram private foundation schemas', () => {
  it('requires at least one non-empty Presentation slot and rejects unknown fields', () => {
    expect(() => DiagramPresentationSchema.parse({})).toThrow(/presentation/i);
    expect(() => DiagramPresentationSchema.parse({ title: '' })).toThrow(/title/i);
    expect(() => DiagramPresentationSchema.parse({ title: { runs: [] } })).toThrow(/title/i);
    expect(() => DiagramPresentationSchema.parse({ title: 'Title', extra: true })).toThrow(/extra/i);
    expect(
      DiagramPresentationSchema.parse({
        title: [{ runs: [{ text: 'A', fill: '#111111' }, { tex: 'x' }] }],
      }),
    ).toEqual({ title: [{ runs: [{ text: 'A', fill: '#111111' }, { tex: 'x' }] }] });
  });

  it('keeps Frame closed, sparse, and non-negative', () => {
    expect(() => DiagramFrameSchema.parse({})).toThrow(/frame/i);
    expect(() => DiagramFrameSchema.parse({ headingMainGap: -1 })).toThrow(/headingMainGap/i);
    expect(() => DiagramFrameSchema.parse({ legendPosition: 'center' })).toThrow(/legendPosition/i);
    const explicitUndefined = DiagramFrameSchema.parse({ padding: undefined });
    expect(Object.hasOwn(explicitUndefined, 'padding')).toBe(true);
    expect(explicitUndefined.padding).toBeUndefined();
    expect(DiagramFrameSchema.parse({ padding: 0, headingMainGap: 0 })).toEqual({
      padding: 0,
      headingMainGap: 0,
    });
  });

  it('requires a non-empty sparse Theme, follows Zod optional undefined, and rejects foreign slices', () => {
    expect(() => DiagramThemeSchema.parse({})).toThrow(/theme/i);
    expect(() => DiagramThemeSchema.parse({ title: {} })).toThrow(/title/i);
    expect(() => DiagramThemeSchema.parse({ frame: { overflow: 'clip' } })).toThrow(/overflow/i);
    const explicitUndefined = DiagramThemeSchema.parse({ description: { opacity: undefined } });
    expect(Object.hasOwn(explicitUndefined.description ?? {}, 'opacity')).toBe(true);
    expect(explicitUndefined.description?.opacity).toBeUndefined();
    expect(
      DiagramThemeSchema.parse({
        title: { font: { size: 20 } },
        frame: { padding: 12 },
      }),
    ).toEqual({
      title: { font: { size: 20 } },
      frame: { padding: 12 },
    });
  });
});
