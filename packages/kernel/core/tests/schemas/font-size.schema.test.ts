import { describe, expect, it } from 'vitest';

import { FontSchema, NodeSchema } from '../../src/schemas';

describe('FontSchema.size', () => {
  it('接受网络预设和相关单位', () => {
    for (const size of ['sm', 'lg', '2xl', '1.25rem', '0.5em']) {
      expect(FontSchema.safeParse({ size }).success).toBe(true);
    }
  });

  it('通过节点 schema 往返字体大小字符串', () => {
    const node = NodeSchema.parse({
      type: 'node',
      position: [0, 0],
      text: 'A',
      style: { font: { size: 'sm' } },
    });

    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });

  it('拒绝未知预设和不支持的 CSS 单位', () => {
    for (const size of ['small', 'Large', 'medium', '12px', '80%', 'calc(1rem + 2px)']) {
      expect(FontSchema.safeParse({ size }).success).toBe(false);
    }
  });

  it('拒绝非正相对单位', () => {
    for (const size of ['0rem', '-1em']) {
      expect(FontSchema.safeParse({ size }).success).toBe(false);
    }
  });
});
