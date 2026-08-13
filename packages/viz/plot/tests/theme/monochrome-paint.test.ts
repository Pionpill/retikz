import { ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getDefaultPlotThemePreset, PlotThemeToken } from '../../src';

describe('default Plot theme monochrome paint', () => {
  it.each(Object.values(ThemeMode))('%s 的文本与结构继承 currentColor', mode => {
    expect(getDefaultPlotThemePreset(mode)).toMatchObject({
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
