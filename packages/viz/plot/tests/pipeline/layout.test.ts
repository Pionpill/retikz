import { describe, expect, it } from 'vitest';

import { computePlotArea } from '../../src/providers';
import { measureLabel } from '../helpers/text-measurement';

describe('computePlotArea (contract)', () => {
  // Happy path
  it('area_no_axis_is_full', () => {
    const { margins, plotArea } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [],
      text: { measure: measureLabel, fontSize: 11 },
    });

    expect(margins).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(plotArea).toEqual({ x: 0, y: 0, width: 480, height: 300 });
  });

  it('area_xy_axis_insets', () => {
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
  it('area_y_label_width_scales', () => {
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

  it('area_only_x_axis', () => {
    const { margins } = computePlotArea({
      size: { width: 480, height: 300 },
      axes: [{ guide: { type: 'axis', dimension: 'x' }, ticks: { values: ['0', '2'], labels: ['0', '2'] } }],
      text: { measure: measureLabel, fontSize: 11 },
    });

    expect(margins.bottom).toBeGreaterThan(0);
    expect(margins.left).toBe(0);
  });

  it('area_font_size_affects', () => {
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
  it('area_margin_override_wins', () => {
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

  it('area_oversized_margin_throws', () => {
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

  it('area_nan_margin_throws', () => {
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

  it('area_negative_margin_throws', () => {
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
