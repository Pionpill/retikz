import { describe, expect, it } from 'vitest';

import { computePlotArea } from '../../src/providers';
import { measureLabel } from '../helpers/text-measurement';

describe('computePlotArea（契约）', () => {
  // Happy path
  it('区域无轴已满', () => {
    const { margins, plotArea } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [],
      text: { measure: measureLabel, fontSize: 11 },
    });

    expect(margins).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(plotArea).toEqual({ x: 0, y: 0, width: 480, height: 300 });
  });

  it('绘图区为 x、y 轴预留内缩空间', () => {
    const { plotArea } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [
        { guide: { type: 'axis', dimension: 'x' }, ticks: { values: ['0', '2'], labels: ['0', '2'] } },
        { guide: { type: 'axis', dimension: 'y' }, ticks: { values: ['9', '14'], labels: ['9', '14'] } },
      ],
      text: { measure: measureLabel, fontSize: 11 },
    });

    // 有 x 轴 → bottom>0；有 y 轴 → left>0；plot area 缩进
    expect(plotArea.x).toBeGreaterThan(0);
    expect(plotArea.y).toBeGreaterThan(0);
    expect(plotArea.width).toBeLessThan(480);
    expect(plotArea.height).toBeLessThan(300);
  });

  // 边界
  it('绘图区随 y 轴标签宽度调整', () => {
    const short = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'y' }, ticks: { values: ['1'], labels: ['1'] } }],
      text: { measure: measureLabel, fontSize: 11 },
    });
    const long = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'y' }, ticks: { values: ['100000'], labels: ['100000'] } }],
      text: { measure: measureLabel, fontSize: 11 },
    });

    // y label 越长 → left margin 越大
    expect(long.margins.left).toBeGreaterThan(short.margins.left);
  });

  it('绘图区仅包含 x 轴', () => {
    const { margins } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'x' }, ticks: { values: ['0', '2'], labels: ['0', '2'] } }],
      text: { measure: measureLabel, fontSize: 11 },
    });

    expect(margins.bottom).toBeGreaterThan(0);
    expect(margins.left).toBe(0);
  });

  it('区域字体大小影响', () => {
    const small = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'x' }, ticks: { values: ['0'], labels: ['0'] } }],
      text: { measure: measureLabel, fontSize: 11 },
    });
    const big = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'x' }, ticks: { values: ['0'], labels: ['0'] } }],
      text: { measure: measureLabel, fontSize: 20 },
    });

    expect(big.margins.bottom).toBeGreaterThan(small.margins.bottom);
  });

  // 错误路径 / 退化
  it('区域边距覆盖获胜', () => {
    const { margins } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'y' }, ticks: { values: ['1'], labels: ['1'] } }],
      text: { measure: measureLabel, fontSize: 11 },
      margin: { left: 80 },
    });

    expect(margins.left).toBe(80);
  });

  it('额外占位逐边叠加，显式 margin 只覆盖指定边', () => {
    const { margins, plotArea } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [],
      text: { measure: measureLabel, fontSize: 11 },
      reserve: { top: 10, right: 40, bottom: 20, left: 30 },
      margin: { left: 50 },
    });

    expect(margins).toEqual({ top: 10, right: 40, bottom: 20, left: 50 });
    expect(plotArea).toEqual({ x: 50, y: 10, width: 390, height: 270 });
  });

  it('区域过大的边距抛出', () => {
    expect(() =>
      computePlotArea({
        size: { width: 480, height: 300 },
        axes: [],
        text: { measure: measureLabel, fontSize: 11 },
        margin: { left: 300, right: 300 },
      }),
    ).toThrow();
    expect(() =>
      computePlotArea({
        size: { width: 480, height: 300 },
        axes: [],
        text: { measure: measureLabel, fontSize: 11 },
        margin: { top: 200, bottom: 200 },
      }),
    ).toThrow();
  });

  it('绘图区 margin 为 NaN 时抛出错误', () => {
    // NaN <= 0 为 false，旧 plotArea 守卫漏过——须逐边校验有限非负
    expect(() =>
      computePlotArea({
        size: { width: 480, height: 300 },
        axes: [],
        text: { measure: measureLabel, fontSize: 11 },
        margin: { left: Number.NaN },
      }),
    ).toThrow(/margin/);
  });

  it('区域负边距抛出', () => {
    // 负 margin 会让 plot area 比画布还宽、图元跑到画布外
    expect(() =>
      computePlotArea({
        size: { width: 480, height: 300 },
        axes: [],
        text: { measure: measureLabel, fontSize: 11 },
        margin: { left: -50 },
      }),
    ).toThrow(/margin/);
  });
});
