import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getPlotThemePreset, PlotThemeToken } from '../../src';

const inheritedPaint = {
  [PlotThemeToken.PlotTypographyForeground]: 'currentColor',
  [PlotThemeToken.AxisLineStroke]: 'currentColor',
  [PlotThemeToken.AxisTickLabelForeground]: 'currentColor',
  [PlotThemeToken.AxisTitleForeground]: 'currentColor',
  [PlotThemeToken.AxisGridStroke]: 'currentColor',
  [PlotThemeToken.LegendTitleForeground]: 'currentColor',
  [PlotThemeToken.LegendLabelForeground]: 'currentColor',
};

const gridOpacity = {
  [ThemeStyle.Neutral]: 0.15,
  [ThemeStyle.Academic]: 0.15,
  [ThemeStyle.Vibrant]: 0.15,
  [ThemeStyle.Clean]: 0.1,
};

describe('Plot theme monochrome paint', () => {
  it.each(Object.values(ThemeStyle))('%s 的文本与结构在两个 mode 下都继承 currentColor', style => {
    for (const mode of Object.values(ThemeMode)) {
      expect(getPlotThemePreset(style, mode)).toMatchObject(inheritedPaint);
    }
  });

  it.each(Object.values(ThemeStyle))('%s 的 surface 在两个 mode 下都保持透明', style => {
    for (const mode of Object.values(ThemeMode)) {
      expect(getPlotThemePreset(style, mode)[PlotThemeToken.PlotSurfaceFill]).toBe('none');
    }
  });

  it.each(Object.values(ThemeStyle))('%s 的 grid 在两个 mode 下使用默认 opacity', style => {
    for (const mode of Object.values(ThemeMode)) {
      expect(getPlotThemePreset(style, mode)[PlotThemeToken.AxisGridDrawOpacity]).toBe(gridOpacity[style]);
    }
  });
});
