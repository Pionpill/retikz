import { describe, expect, it } from 'vitest';
import {
  ASCENT_FACTOR,
  DESCENT_FACTOR,
  toAlphabeticBaselineY,
} from '../../src/compile/text-baseline';

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

  it('alphabetic 锚点原样返回（首行基线 = 锚点）', () => {
    expect(toAlphabeticBaselineY(100, 'alphabetic', 1, lineHeight, fontSize)).toBe(100);
  });

  it('top 单行：块顶（ascent 线）落在锚点', () => {
    const b = toAlphabeticBaselineY(100, 'top', 1, lineHeight, fontSize);
    expect(b - asc).toBeCloseTo(100, 10);
  });

  it('bottom 单行：块底（descent 线）落在锚点', () => {
    const b = toAlphabeticBaselineY(100, 'bottom', 1, lineHeight, fontSize);
    expect(b + desc).toBeCloseTo(100, 10);
  });

  it('middle 单行：视觉中心落在锚点', () => {
    const b = toAlphabeticBaselineY(100, 'middle', 1, lineHeight, fontSize);
    const top = b - asc;
    const bottom = b + desc;
    expect((top + bottom) / 2).toBeCloseTo(100, 10);
  });

  it('middle 多行：整块视觉中心落在锚点（绕锚点对称居中）', () => {
    const n = 3;
    const b = toAlphabeticBaselineY(100, 'middle', n, lineHeight, fontSize);
    const top = b - asc;
    const bottom = b + (n - 1) * lineHeight + desc;
    expect((top + bottom) / 2).toBeCloseTo(100, 10);
  });

  it('top 多行：块顶（首行 ascent 线）落在锚点', () => {
    const n = 2;
    const b = toAlphabeticBaselineY(100, 'top', n, lineHeight, fontSize);
    expect(b - asc).toBeCloseTo(100, 10);
  });

  it('bottom 多行：块底（末行 descent 线）落在锚点', () => {
    const n = 2;
    const b = toAlphabeticBaselineY(100, 'bottom', n, lineHeight, fontSize);
    expect(b + (n - 1) * lineHeight + desc).toBeCloseTo(100, 10);
  });
});
