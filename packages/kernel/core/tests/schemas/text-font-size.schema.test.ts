import { describe, expect, it } from 'vitest';

import { FontSchema } from '../../src/schemas';

describe('FontSchema.size', () => {
  it('接受整数部分或小数起始的正相对字号', () => {
    for (const size of ['1.25rem', '.5em']) {
      expect(FontSchema.safeParse({ size }).success).toBe(true);
    }
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
