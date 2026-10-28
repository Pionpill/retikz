import { describe, expect, it } from 'vitest';

import {
  LineSchema,
  MathSegmentSchema,
  SegmentedLineSchema,
  NodeSchema,
  TextSegmentSchema,
  NodeLabelSchema,
  PathLabelSchema,
} from '../../src/schemas';

describe('标签文本块', () => {
  it.each([NodeLabelSchema, PathLabelSchema])('接受共享文本块并拒绝非块输入', schema => {
    const text = ['first', { text: 'second', fill: '#f00' }, { segments: [{ text: 'third' }] }];
    expect(schema.parse({ text }).text).toEqual(text);
    expect(schema.safeParse({ text: [] }).success).toBe(false);
    expect(schema.safeParse({ text: { segments: [{ text: 'old' }] } }).success).toBe(false);
  });
});

describe('[文本段]段 schema', () => {
  it('接受具有每段样式的文本段', () => {
    expect(TextSegmentSchema.safeParse({ text: 'E=', fill: '#f00', opacity: 0.8 }).success).toBe(true);
  });

  it('接受带有 tex / displayMode / fill 的数学段', () => {
    expect(MathSegmentSchema.safeParse({ tex: 'mc^2', displayMode: true, fill: '#00f' }).success).toBe(true);
  });

  it('拒绝同时携带文本和 tex 的段（严格）', () => {
    expect(TextSegmentSchema.safeParse({ text: 'x', tex: 'y' }).success).toBe(false);
    expect(MathSegmentSchema.safeParse({ tex: 'y', text: 'x' }).success).toBe(false);
  });

  it('接受文本+数学段的混合行', () => {
    expect(SegmentedLineSchema.safeParse({ segments: [{ text: 'when ' }, { tex: 'v=d/t' }] }).success).toBe(true);
  });

  it('拒绝空段数组', () => {
    expect(SegmentedLineSchema.safeParse({ segments: [] }).success).toBe(false);
  });

  it('承认混合线作为 IR 线', () => {
    expect(LineSchema.safeParse({ segments: [{ tex: 'x' }] }).success).toBe(true);
  });

  it('往返文本为显式段序列的节点', () => {
    const node = NodeSchema.parse({
      type: 'node',
      id: 'eq',
      position: [0, 0],
      text: [
        {
          segments: [
            { text: 'E=', opacity: 0.9 },
            { tex: 'mc^2', displayMode: false },
          ],
        },
      ],
    });

    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });
});
