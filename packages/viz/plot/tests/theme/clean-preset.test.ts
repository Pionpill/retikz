import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getPlotThemePreset, PlotThemeToken } from '../../src';

describe('Clean Plot theme preset', () => {
  it('在 Light 与 Dark 下都保持透明画布', () => {
    expect(getPlotThemePreset(ThemeStyle.Clean, ThemeMode.Light)[PlotThemeToken.PlotSurfaceFill]).toBe('none');
    expect(getPlotThemePreset(ThemeStyle.Clean, ThemeMode.Dark)[PlotThemeToken.PlotSurfaceFill]).toBe('none');
  });

  it('用可读的无衬线排版建立紧凑层级', () => {
    const preset = getPlotThemePreset(ThemeStyle.Clean, ThemeMode.Light);

    expect(preset[PlotThemeToken.PlotTypographyFontFamily]).toContain('Inter');
    expect(preset[PlotThemeToken.PlotTypographyFontSize]).toBeGreaterThanOrEqual(12);
    expect(preset[PlotThemeToken.PlotLabelFontSize]).toBeGreaterThanOrEqual(11);
    expect(preset[PlotThemeToken.LegendSwatchSize]).toBeGreaterThanOrEqual(12);
  });

  it('隐藏轴线与 tick，同时保留低对比网格', () => {
    for (const mode of Object.values(ThemeMode)) {
      const preset = getPlotThemePreset(ThemeStyle.Clean, mode);
      const gridOpacity = preset[PlotThemeToken.AxisGridDrawOpacity];

      expect(preset[PlotThemeToken.AxisLineEnabled]).toBe(false);
      expect(preset[PlotThemeToken.AxisTickMark]).toBe(false);
      expect(gridOpacity).toBeGreaterThan(0);
      expect(gridOpacity).toBeLessThan(0.5);
    }
  });
});
