import { describe, expect, it } from 'vitest';
import { computePlotArea } from '../../src/lower/layout';

const noAxis = { hasXAxis: false, hasYAxis: false, xLabels: [], yLabels: [] };

describe('computePlotArea (ADR-03)', () => {
  // Happy path
  it('area_no_axis_is_full', () => {
    const { margins, plotArea } = computePlotArea(480, 300, noAxis);
    expect(margins).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(plotArea).toEqual({ x: 0, y: 0, width: 480, height: 300 });
  });

  it('area_xy_axis_insets', () => {
    const { plotArea } = computePlotArea(480, 300, {
      hasXAxis: true,
      hasYAxis: true,
      xLabels: ['0', '2'],
      yLabels: ['9', '14'],
    });
    // 有 x 轴 → bottom>0；有 y 轴 → left>0；plot area 缩进
    expect(plotArea.x).toBeGreaterThan(0);
    expect(plotArea.y).toBeGreaterThan(0);
    expect(plotArea.width).toBeLessThan(480);
    expect(plotArea.height).toBeLessThan(300);
  });

  // 边界
  it('area_y_label_width_scales', () => {
    const short = computePlotArea(480, 300, { hasXAxis: false, hasYAxis: true, xLabels: [], yLabels: ['1'] });
    const long = computePlotArea(480, 300, { hasXAxis: false, hasYAxis: true, xLabels: [], yLabels: ['100000'] });
    // y label 越长 → left margin 越大
    expect(long.margins.left).toBeGreaterThan(short.margins.left);
  });

  it('area_only_x_axis', () => {
    const { margins } = computePlotArea(480, 300, { hasXAxis: true, hasYAxis: false, xLabels: ['0', '2'], yLabels: [] });
    expect(margins.bottom).toBeGreaterThan(0);
    expect(margins.left).toBe(0);
  });

  it('area_font_size_affects', () => {
    const small = computePlotArea(480, 300, { hasXAxis: true, hasYAxis: false, xLabels: ['0'], yLabels: [] }, { fontSize: 11 });
    const big = computePlotArea(480, 300, { hasXAxis: true, hasYAxis: false, xLabels: ['0'], yLabels: [] }, { fontSize: 20 });
    expect(big.margins.bottom).toBeGreaterThan(small.margins.bottom);
  });

  // 错误路径 / 退化
  it('area_margin_override_wins', () => {
    const { margins } = computePlotArea(480, 300, { hasXAxis: false, hasYAxis: true, xLabels: [], yLabels: ['1'] }, { margin: { left: 80 } });
    expect(margins.left).toBe(80);
  });

  it('area_oversized_margin_throws', () => {
    expect(() => computePlotArea(480, 300, noAxis, { margin: { left: 300, right: 300 } })).toThrow();
    expect(() => computePlotArea(480, 300, noAxis, { margin: { top: 200, bottom: 200 } })).toThrow();
  });

  it('area_nan_margin_throws', () => {
    // NaN <= 0 为 false，旧 plotArea 守卫漏过——须逐边校验有限非负
    expect(() => computePlotArea(480, 300, noAxis, { margin: { left: Number.NaN } })).toThrow(/margin/);
  });

  it('area_negative_margin_throws', () => {
    // 负 margin 会让 plot area 比画布还宽、图元跑到画布外
    expect(() => computePlotArea(480, 300, noAxis, { margin: { left: -50 } })).toThrow(/margin/);
  });
});
