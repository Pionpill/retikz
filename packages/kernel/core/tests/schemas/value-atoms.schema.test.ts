import { describe, expect, it } from 'vitest';

import {
  ContextualColorSchema,
  CssColorSchema,
  FontFamilySchema,
  FontSchema,
  FontStyleSchema,
  FontWeightSchema,
  LineHeightSchema,
  NodeSchema,
  PaintValueSchema,
  StrokeStyleSchema,
  StrokeWidthSchema,
  TextAlignSchema,
} from '../../src';

describe('Core value atom schemas', () => {
  it('preserves non-blank CSS color strings and rejects blank values', () => {
    expect(CssColorSchema.parse(' currentColor ')).toBe(' currentColor ');
    for (const color of ['', '   ']) {
      expect(CssColorSchema.safeParse(color).success).toBe(false);
    }
  });

  it('accepts normalized numeric weights only in contextual color atoms', () => {
    for (const color of ['currentColor', '#336699', 0, 0.4, 1]) {
      expect(ContextualColorSchema.safeParse(color).success).toBe(true);
    }
    for (const color of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(ContextualColorSchema.safeParse(color).success).toBe(false);
    }
    expect(PaintValueSchema.parse(0.4)).toBe(0.4);
  });

  it('keeps graphic masters and paint-internal colors string-only', () => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], color: 0.4 }).success).toBe(false);
    expect(
      PaintValueSchema.safeParse({
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: 0.2 },
          { offset: 1, color: '#ffffff' },
        ],
      }).success,
    ).toBe(false);
  });

  it('parses font family, weight, and style with the existing Font contract', () => {
    for (const family of ['', 'serif', 'Inter, sans-serif']) {
      expect(FontFamilySchema.safeParse(family).success).toBe(true);
    }
    expect(FontFamilySchema.safeParse(12).success).toBe(false);

    for (const weight of ['normal', 'bold', -100, 450]) {
      expect(FontWeightSchema.safeParse(weight).success).toBe(true);
    }
    expect(FontWeightSchema.safeParse('semibold').success).toBe(false);

    for (const style of ['normal', 'italic', 'oblique']) {
      expect(FontStyleSchema.safeParse(style).success).toBe(true);
    }
    expect(FontStyleSchema.safeParse('slanted').success).toBe(false);
  });

  it('parses text alignment and line height with the existing Node contract', () => {
    for (const align of ['start', 'middle', 'end']) {
      expect(TextAlignSchema.safeParse(align).success).toBe(true);
    }
    expect(TextAlignSchema.safeParse('center').success).toBe(false);

    expect(LineHeightSchema.safeParse(1).success).toBe(true);
    expect(LineHeightSchema.safeParse(0).success).toBe(false);
    expect(LineHeightSchema.safeParse(-1).success).toBe(false);
  });

  it('parses stroke width with the existing shared stroke contract', () => {
    expect(StrokeWidthSchema.safeParse(0).success).toBe(true);
    expect(StrokeWidthSchema.safeParse(2).success).toBe(true);
    expect(StrokeWidthSchema.safeParse(-1).success).toBe(false);
    expect(StrokeWidthSchema.safeParse('2').success).toBe(false);
  });

  it('reuses the named atoms in compatibility aggregate schemas', () => {
    expect(FontSchema.shape.family.unwrap()).toBe(FontFamilySchema);
    expect(FontSchema.shape.weight.unwrap()).toBe(FontWeightSchema);
    expect(FontSchema.shape.style.unwrap()).toBe(FontStyleSchema);
    expect(NodeSchema.shape.align.unwrap()).toBe(TextAlignSchema);
    expect(NodeSchema.shape.lineHeight.unwrap()).toBe(LineHeightSchema);
    expect(StrokeStyleSchema.shape.strokeWidth.unwrap()).toBe(StrokeWidthSchema);
  });
});
