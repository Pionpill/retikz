import { describe, expect, it } from 'vitest';

import {
  FontFamilySchema,
  FontSchema,
  FontStyleSchema,
  FontWeightSchema,
  LineHeightSchema,
  NodeSchema,
  StrokeStyleSchema,
  StrokeWidthSchema,
  TextAlignSchema,
} from '../../src';

describe('Core value atom schemas', () => {
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
