import { describe, expect, it } from 'vitest';
import type { FontSpec } from '../../src/compile/text-metrics';
import { fallbackMeasurer } from '../../src/compile/text-metrics';

const font14: FontSpec = { size: 14 };

describe('fallbackMeasurer', () => {
  it('空字符串：width=0，height 仍按 1.2×size', () => {
    expect(fallbackMeasurer('', font14)).toEqual({
      width: 0,
      height: 14 * 1.2,
    });
  });

  it('width = 字符数 × size × 0.55（粗略平均字宽）', () => {
    expect(fallbackMeasurer('hello', font14)).toEqual({
      width: 5 * 14 * 0.55,
      height: 14 * 1.2,
    });
  });

  it('height 始终 = size × 1.2，不随文本长度变', () => {
    const a = fallbackMeasurer('a', { size: 10 });
    const b = fallbackMeasurer('a-very-long-line', { size: 10 });
    expect(a.height).toBe(b.height);
    expect(a.height).toBe(12);
  });

  it('size 不同 → width / height 线性缩放', () => {
    const s14 = fallbackMeasurer('abc', { size: 14 });
    const s28 = fallbackMeasurer('abc', { size: 28 });
    expect(s28.width).toBe(s14.width * 2);
    expect(s28.height).toBe(s14.height * 2);
  });

  it('忽略 family / weight / style——fallback 不取这些字段', () => {
    const plain = fallbackMeasurer('abc', { size: 14 });
    const bold = fallbackMeasurer('abc', { size: 14, weight: 'bold', style: 'italic', family: 'serif' });
    expect(bold).toEqual(plain);
  });

  it('返回对象无 ascent / descent——fallback 不知道基线信息', () => {
    const m = fallbackMeasurer('abc', font14);
    expect(m).not.toHaveProperty('ascent');
    expect(m).not.toHaveProperty('descent');
  });
});
