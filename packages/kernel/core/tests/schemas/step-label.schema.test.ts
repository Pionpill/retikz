import { describe, expect, it } from 'vitest';

import { PathLabelSchema } from '../../src/schemas';

describe('PathLabelSchema 新增样式字段', () => {
  it('接受与 Node 相同的多行 TextBlock', () => {
    const text = [
      '标题',
      { text: '说明', fill: 'gray', font: { size: 10 } },
      { segments: [{ text: 'x = ' }, { tex: '1' }] },
    ];

    expect(PathLabelSchema.parse({ text })).toMatchObject({ text });
  });

  it('接受 interrupt 布尔开关', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', interrupt: true }).success).toBe(true);
    expect(PathLabelSchema.safeParse({ text: 'x', interrupt: false }).success).toBe(true);
  });

  it('接受非负的断口两侧留白', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', gap: 0 }).success).toBe(true);
    expect(PathLabelSchema.safeParse({ text: 'x', gap: 8 }).success).toBe(true);
  });

  it('接受 textColor', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', textColor: 'red' }).success).toBe(true);
    expect(PathLabelSchema.safeParse({ text: 'x', textColor: 0.35 }).success).toBe(true);
  });

  it('接受 opacity 0..1', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', opacity: 0.6 }).success).toBe(true);
    expect(PathLabelSchema.safeParse({ text: 'x', opacity: 0 }).success).toBe(true);
    expect(PathLabelSchema.safeParse({ text: 'x', opacity: 1 }).success).toBe(true);
  });

  it('接受 font（复用 FontSchema）', () => {
    expect(
      PathLabelSchema.safeParse({
        text: 'x',
        font: { size: 10, family: 'serif', weight: 'bold', style: 'italic' },
      }).success,
    ).toBe(true);
  });

  it('三字段同时设 + text/position/side 共存', () => {
    expect(
      PathLabelSchema.safeParse({
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

describe('PathLabelSchema 错误路径', () => {
  it('拒绝空的多行 TextBlock', () => {
    expect(PathLabelSchema.safeParse({ text: [] }).success).toBe(false);
  });

  it('interrupt 非布尔值拒绝', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', interrupt: 'always' }).success).toBe(false);
    expect(PathLabelSchema.safeParse({ text: 'x', interrupt: 1 }).success).toBe(false);
  });

  it('断口两侧留白拒绝负数与非有限值', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', gap: -1 }).success).toBe(false);
    expect(PathLabelSchema.safeParse({ text: 'x', gap: Infinity }).success).toBe(false);
  });

  it('保持严格对象，拒绝未知字段', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', interrupt: true, unexpected: true }).success).toBe(false);
  });

  it('opacity 越界拒（>1）', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', opacity: 1.5 }).success).toBe(false);
  });

  it('opacity 负值拒', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', opacity: -0.1 }).success).toBe(false);
  });

  it('font 非法字段类型拒（size 为字符串）', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', font: { size: 'big' } }).success).toBe(false);
  });

  it('textColor 非字符串拒', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', textColor: 123 }).success).toBe(false);
  });
});

describe('PathLabelSchema 零破坏（旧形态仍合法）', () => {
  it('仅 text', () => {
    expect(PathLabelSchema.safeParse({ text: 'x' }).success).toBe(true);
  });

  it('text + position + side（v0.1 形态）', () => {
    expect(PathLabelSchema.safeParse({ text: 'x', position: 'midway', side: 'top' }).success).toBe(true);
  });
});

describe('StepLabel JSON round-trip', () => {
  it('interrupt 序列化往返保持布尔值', () => {
    const label = { text: 'gap', interrupt: false };

    expect(PathLabelSchema.parse(JSON.parse(JSON.stringify(label)))).toEqual(label);
  });

  it('含三新字段的 label 序列化往返语义等价', () => {
    const label = {
      text: 'sin',
      position: 'near-end' as const,
      side: 'bottom' as const,
      textColor: '#333',
      opacity: 0.8,
      font: { size: 10, family: 'serif' },
    };

    expect(PathLabelSchema.parse(JSON.parse(JSON.stringify(label)))).toEqual({
      ...label,
      side: 'bottom',
    });
  });
});
