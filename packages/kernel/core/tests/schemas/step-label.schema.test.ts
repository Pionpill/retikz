import { describe, expect, it } from 'vitest';

import { StepLabelSchema } from '../../src/schemas';

describe('StepLabelSchema 新增样式字段', () => {
  it('接受 textColor', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', textColor: 'red' }).success).toBe(true);
    expect(StepLabelSchema.safeParse({ text: 'x', textColor: 0.35 }).success).toBe(true);
  });

  it('接受 opacity 0..1', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', opacity: 0.6 }).success).toBe(true);
    expect(StepLabelSchema.safeParse({ text: 'x', opacity: 0 }).success).toBe(true);
    expect(StepLabelSchema.safeParse({ text: 'x', opacity: 1 }).success).toBe(true);
  });

  it('接受 font（复用 FontSchema）', () => {
    expect(
      StepLabelSchema.safeParse({
        text: 'x',
        font: { size: 10, family: 'serif', weight: 'bold', style: 'italic' },
      }).success,
    ).toBe(true);
  });

  it('三字段同时设 + text/position/side 共存', () => {
    expect(
      StepLabelSchema.safeParse({
        text: 'sin',
        position: 'near-end',
        side: 'bottom',
        textColor: '#333',
        opacity: 0.8,
        font: { size: 10 },
      }).success,
    ).toBe(true);
  });
});

describe('StepLabelSchema 错误路径', () => {
  it('opacity 越界拒（>1）', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', opacity: 1.5 }).success).toBe(false);
  });

  it('opacity 负值拒', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', opacity: -0.1 }).success).toBe(false);
  });

  it('font 非法字段类型拒（size 为字符串）', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', font: { size: 'big' } }).success).toBe(false);
  });

  it('textColor 非字符串拒', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', textColor: 123 }).success).toBe(false);
  });
});

describe('StepLabelSchema 零破坏（旧形态仍合法）', () => {
  it('仅 text', () => {
    expect(StepLabelSchema.safeParse({ text: 'x' }).success).toBe(true);
  });

  it('text + position + side（v0.1 形态）', () => {
    expect(StepLabelSchema.safeParse({ text: 'x', position: 'midway', side: 'top' }).success).toBe(true);
  });
});

describe('StepLabel JSON round-trip', () => {
  it('含三新字段的 label 序列化往返语义等价', () => {
    const label = {
      text: 'sin',
      position: 'near-end' as const,
      side: 'bottom' as const,
      textColor: '#333',
      opacity: 0.8,
      font: { size: 10, family: 'serif' },
    };
    expect(StepLabelSchema.parse(JSON.parse(JSON.stringify(label)))).toEqual({
      ...label,
      side: 'bottom',
    });
  });
});
