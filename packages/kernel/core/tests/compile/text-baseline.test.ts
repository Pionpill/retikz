import { describe, expect, it } from 'vitest';

import { ASCENT_FACTOR, DESCENT_FACTOR, toAlphabeticBaselineY } from '../../src/compile/text';

/**
 * 任意 baseline 锚点 → 首行 alphabetic 基线 y 的折算
 * @description core 统一把 top/middle/bottom 折算成 alphabetic（唯一在 canvas textBaseline 与
 *   SVG dominant-baseline 两套模型里定义一致的基线），把垂直定位从两个 adapter 上移到编译期，
 *   消除「同名异义」导致的跨后端基线漂移。断言折算后文本块的视觉边界落在关键字所指位置，
 *   对 ascent/descent 近似常量的取值鲁棒。
 */
describe('toAlphabeticBaselineY', () => {
  const fontSize = 16;
  const lineHeight = 20;
  const asc = fontSize * ASCENT_FACTOR;
  const desc = fontSize * DESCENT_FACTOR;
  const baselineY = (baseline: 'top' | 'middle' | 'bottom' | 'alphabetic', lineCount: number) =>
    toAlphabeticBaselineY({ y: 100, baseline, lineCount, lineHeight, fontSize });

  it('alphabetic 锚点原样返回（首行基线 = 锚点）', () => {
    expect(baselineY('alphabetic', 1)).toBe(100);
  });

  it('top 单行：块顶（ascent 线）落在锚点', () => {
    const b = baselineY('top', 1);
    expect(b - asc).toBeCloseTo(100, 10);
  });

  it('bottom 单行：块底（descent 线）落在锚点', () => {
    const b = baselineY('bottom', 1);
    expect(b + desc).toBeCloseTo(100, 10);
  });

  it('middle 单行：视觉中心落在锚点', () => {
    const b = baselineY('middle', 1);
    const top = b - asc;
    const bottom = b + desc;
    expect((top + bottom) / 2).toBeCloseTo(100, 10);
  });

  it('middle 多行：整块视觉中心落在锚点（绕锚点对称居中）', () => {
    const n = 3;
    const b = baselineY('middle', n);
    const top = b - asc;
    const bottom = b + (n - 1) * lineHeight + desc;
    expect((top + bottom) / 2).toBeCloseTo(100, 10);
  });

  it('top 多行：块顶（首行 ascent 线）落在锚点', () => {
    const n = 2;
    const b = baselineY('top', n);
    expect(b - asc).toBeCloseTo(100, 10);
  });

  it('bottom 多行：块底（末行 descent 线）落在锚点', () => {
    const n = 2;
    const b = baselineY('bottom', n);
    expect(b + (n - 1) * lineHeight + desc).toBeCloseTo(100, 10);
  });
});
