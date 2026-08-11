import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getPlotThemePreset, PlotThemeToken } from '../../src';

describe('Neutral Plot theme monochrome paint', () => {
  it.each(Object.values(ThemeMode))('%s 的文本与结构继承 currentColor', mode => {
    expect(getPlotThemePreset(ThemeStyle.Neutral, mode)).toMatchObject({
      [PlotThemeToken.PlotTypographyForeground]: 'currentColor',
      [PlotThemeToken.AxisLineStroke]: 'currentColor',
      [PlotThemeToken.AxisTickLabelForeground]: 'currentColor',
      [PlotThemeToken.AxisTitleForeground]: 'currentColor',
      [PlotThemeToken.LegendTitleForeground]: 'currentColor',
      [PlotThemeToken.LegendLabelForeground]: 'currentColor',
      [PlotThemeToken.PlotAreaFill]: 'none',
      [PlotThemeToken.AxisGridStroke]: 'currentColor',
      [PlotThemeToken.AxisGridDrawOpacity]: 0.15,
    });
  });
});
