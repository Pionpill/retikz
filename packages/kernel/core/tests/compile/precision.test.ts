import { describe, expect, it } from 'vitest';
import { DEFAULT_PRECISION, createRound } from '../../src/compile/precision';

describe('DEFAULT_PRECISION', () => {
  it('默认 2 位小数——所有 Scene 输出走这个精度', () => {
    expect(DEFAULT_PRECISION).toBe(2);
  });
});

describe('createRound', () => {
  it('precision=0 取整', () => {
    const r = createRound(0);
    expect(r(1.4)).toBe(1);
    expect(r(1.5)).toBe(2);
    expect(r(-1.5)).toBe(-1); // Math.round(-1.5) = -1（JS 银行家规则的常见误区，本测试锚定行为）
  });

  it('precision=2 保留 2 位小数', () => {
    const r = createRound(2);
    expect(r(1.234)).toBe(1.23);
    expect(r(1.235)).toBeCloseTo(1.24, 5); // 浮点误差容差
    expect(r(0)).toBe(0);
    expect(r(-3.14159)).toBe(-3.14);
  });

  it('precision=3 保留 3 位小数', () => {
    const r = createRound(3);
    expect(r(1.23456)).toBeCloseTo(1.235, 5);
  });

  it('整数输入原样返回', () => {
    expect(createRound(2)(7)).toBe(7);
    expect(createRound(0)(0)).toBe(0);
  });

  it('Infinity / NaN 透传不报错', () => {
    const r = createRound(2);
    expect(r(Infinity)).toBe(Infinity);
    expect(r(-Infinity)).toBe(-Infinity);
    expect(r(NaN)).toBeNaN();
  });

  it('负的亚精度值归一为 +0（不产 -0，保 Scene JSON round-trip 在 Object.is 层稳定）', () => {
    const r = createRound(2);
    // Math.round(-0.001*100)/100 = -0；归一后为 +0
    expect(Object.is(r(-0.001), 0)).toBe(true);
    expect(Object.is(r(-0), 0)).toBe(true);
    expect(Object.is(r(-0.004), 0)).toBe(true);
    // 数值上仍等于 0，序列化为 "0"（round-trip 不失真）
    expect(r(-0.001)).toBe(0);
    expect(JSON.stringify(r(-0.001))).toBe('0');
  });
});
