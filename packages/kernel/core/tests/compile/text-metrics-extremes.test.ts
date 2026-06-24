import { describe, expect, it } from 'vitest';
import { fallbackMeasurer } from '../../src/compile/text-metrics';

describe('fallbackMeasurer 边界', () => {
  it('size=0 → 返回 (0, 0)（与 text="" 退化一致）', () => {
    expect(fallbackMeasurer('hello', { size: 0 })).toEqual({ width: 0, height: 0 });
  });

  it('text="" + size>0 → width=0、height=size×1.2', () => {
    expect(fallbackMeasurer('', { size: 10 })).toEqual({ width: 0, height: 12 });
  });

  it('负 size → 抛错且 message 含具体值', () => {
    expect(() => fallbackMeasurer('x', { size: -1 })).toThrow(/-1/);
    expect(() => fallbackMeasurer('x', { size: -1 })).toThrow(/non-negative/);
  });

  it('NaN size → 抛错', () => {
    expect(() => fallbackMeasurer('x', { size: NaN })).toThrow(/NaN/);
  });

  it('Infinity size → 抛错（非有限输入不放进 Scene）', () => {
    expect(() => fallbackMeasurer('x', { size: Infinity })).toThrow(/Infinity/);
    expect(() => fallbackMeasurer('x', { size: Infinity })).toThrow(/finite/);
  });

  it('多 codepoint emoji 文本：按 length（UTF-16 code unit）算宽——已知不准，但不应崩', () => {
    // '👨‍👩‍👧' 由多 codepoint 组成，length 远大于 1 视觉字符
    const res = fallbackMeasurer('👨‍👩‍👧', { size: 10 });
    expect(res.width).toBeGreaterThan(0);
    expect(res.height).toBe(12);
  });
});
