import { describe, expect, it } from 'vitest';
import { lerpColorOklch, sampleColorOklch } from '../src/animation/oklch';

/**
 * oklch 颜色插值（fill / stroke 动画核心数学）锁定测试：
 *   解析等价（hex3↔hex6 / rgb↔hex）、无法解析回退、色相 360° 环绕最短路径、预采样退化。
 */

/** `#rrggbb` → [r, g, b] 字节 */
const rgbOf = (hex: string): [number, number, number] => {
  const h = hex.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

describe('颜色解析等价', () => {
  it('hex3 与 hex6 解析一致', () => {
    expect(sampleColorOklch('#f00', '#00f', 4)).toEqual(sampleColorOklch('#ff0000', '#0000ff', 4));
  });

  it('rgb() 与 hex 解析一致', () => {
    expect(lerpColorOklch('rgb(255, 0, 0)', 'rgb(0, 0, 255)', 0.5)).toBe(lerpColorOklch('#ff0000', '#0000ff', 0.5));
  });
});

describe('无法解析回退', () => {
  it('命名色 / 不支持串 → 按 t 直选端点（不平滑）', () => {
    expect(lerpColorOklch('red', 'blue', 0.3)).toBe('red');
    expect(lerpColorOklch('red', 'blue', 0.7)).toBe('blue');
    // t<0.5 取 from，否则 to —— 0.5 落到 to
    expect(lerpColorOklch('red', 'blue', 0.5)).toBe('blue');
  });
});

describe('oklch 插值', () => {
  it('t=0 精确返回 from 端点色（解析+回采样）', () => {
    expect(lerpColorOklch('#000000', '#ffffff', 0)).toBe('#000000');
  });

  it('同色自插值在任意 t 稳定（幂等）', () => {
    expect(lerpColorOklch('#abcdef', '#abcdef', 0.5)).toBe(lerpColorOklch('#abcdef', '#abcdef', 0));
  });

  it('黑白中点为居中灰阶', () => {
    const [r, g, b] = rgbOf(lerpColorOklch('#000000', '#ffffff', 0.5));
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(255);
  });
});

describe('色相 360° 环绕', () => {
  it('350°→10° 走最短 +20° 路径（穿 0°），而非反向 −340°', () => {
    // 最短路径中点 = H 0°；若 hueDelta 不处理环绕，中点会落到 H≈180°，hex 完全不同
    const wrapped = lerpColorOklch('oklch(0.7 0.15 350)', 'oklch(0.7 0.15 10)', 0.5);
    const atZero = lerpColorOklch('oklch(0.7 0.15 0)', 'oklch(0.7 0.15 0)', 0);
    expect(wrapped).toBe(atZero);
  });
});

describe('alpha 通道', () => {
  it('rgba() 端点的 alpha 被保留并插值（输出 #rrggbbaa）', () => {
    const out = lerpColorOklch('rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.8)', 0.5);
    // 中点 alpha = 0.5 → 0x80；颜色仍为黑
    expect(out).toMatch(/^#[0-9a-f]{8}$/);
    expect(out.slice(7, 9)).toBe('80');
  });

  it('不透明端点（alpha=1）输出 6 位 hex（不带 alpha）', () => {
    expect(lerpColorOklch('#000000', '#ffffff', 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('#rrggbbaa 端点的 alpha 被解析并保留', () => {
    const out = lerpColorOklch('#00000000', '#000000ff', 0);
    expect(out.slice(7, 9)).toBe('00');
  });

  it('oklch(L C H / a) 的 alpha 被解析并保留', () => {
    const out = lerpColorOklch('oklch(0.5 0.1 120 / 0.4)', 'oklch(0.5 0.1 120 / 0.4)', 0.5);
    expect(out).toMatch(/^#[0-9a-f]{8}$/);
    expect(out.slice(7, 9)).toBe('66'); // 0.4 × 255 ≈ 0x66
  });

  it('预采样同样保留并插值 alpha', () => {
    const samples = sampleColorOklch('rgba(0,0,0,0)', 'rgba(0,0,0,1)', 4);
    expect(samples[0].slice(7, 9)).toBe('00');
    expect(samples[4]).toMatch(/^#[0-9a-f]{6}$/); // alpha=1 退回 6 位
  });
});

describe('sampleColorOklch 预采样', () => {
  it('返回 segments+1 个采样，首项为 from', () => {
    const samples = sampleColorOklch('#000000', '#ffffff', 8);
    expect(samples).toHaveLength(9);
    expect(samples[0]).toBe('#000000');
  });

  it('segments<1 退化为 [from, to]', () => {
    expect(sampleColorOklch('#000000', '#ffffff', 0)).toEqual(['#000000', '#ffffff']);
  });

  it('端点无法解析时退化为 [from, to]', () => {
    expect(sampleColorOklch('red', 'blue', 8)).toEqual(['red', 'blue']);
  });
});
