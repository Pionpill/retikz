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
  GraphicStrokeSchema,
  StrokeWidthSchema,
  TextAlignSchema,
} from '../../src';

describe('Core 值原子 schema', () => {
  it('保留非空白 CSS 颜色字符串并拒绝空白值', () => {
    expect(CssColorSchema.parse(' currentColor ')).toBe(' currentColor ');

    for (const color of ['', '   ']) {
      expect(CssColorSchema.safeParse(color).success).toBe(false);
    }
  });

  it('仅在上下文颜色原子中接受标准化数字权重', () => {
    for (const color of ['currentColor', '#336699', 0, 0.4, 1]) {
      expect(ContextualColorSchema.safeParse(color).success).toBe(true);
    }

    for (const color of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(ContextualColorSchema.safeParse(color).success).toBe(false);
    }

    expect(PaintValueSchema.parse(0.4)).toBe(0.4);
  });

  it('仅保留图形母版和绘制内部颜色字符串', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        style: { color: 0.4 },
      }).success,
    ).toBe(false);
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

  it('使用现有的 Font 契约解析字体系列、粗细和样式', () => {
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

  it('使用现有的 Node 契约解析文本对齐和行高', () => {
    for (const align of ['start', 'middle', 'end']) {
      expect(TextAlignSchema.safeParse(align).success).toBe(true);
    }

    expect(TextAlignSchema.safeParse('center').success).toBe(false);

    expect(LineHeightSchema.safeParse(1).success).toBe(true);
    expect(LineHeightSchema.safeParse(0).success).toBe(false);
    expect(LineHeightSchema.safeParse(-1).success).toBe(false);
  });

  it('使用现有的共享描边契约解析描边宽度', () => {
    expect(StrokeWidthSchema.safeParse(0).success).toBe(true);
    expect(StrokeWidthSchema.safeParse(2).success).toBe(true);
    expect(StrokeWidthSchema.safeParse(-1).success).toBe(false);
    expect(StrokeWidthSchema.safeParse('2').success).toBe(false);
  });

  it('在兼容性聚合 schema 中重用命名原子', () => {
    expect(FontSchema.shape.family.unwrap()).toBe(FontFamilySchema);
    expect(FontSchema.shape.weight.unwrap()).toBe(FontWeightSchema);
    expect(FontSchema.shape.style.unwrap()).toBe(FontStyleSchema);
    expect(NodeSchema.shape.layout.unwrap().shape.align.unwrap()).toBe(TextAlignSchema);
    expect(NodeSchema.shape.layout.unwrap().shape.lineHeight.unwrap()).toBe(LineHeightSchema);
    expect(GraphicStrokeSchema.shape.strokeWidth.unwrap()).toBe(StrokeWidthSchema);
  });
});
