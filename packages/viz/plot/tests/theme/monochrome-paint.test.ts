import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getPlotThemePreset, PlotThemeToken } from '../../src';

const inheritedPaint = {
  [PlotThemeToken.PlotTypographyForeground]: 'currentColor',
  [PlotThemeToken.AxisLineStroke]: 'currentColor',
  [PlotThemeToken.AxisTickLabelForeground]: 'currentColor',
  [PlotThemeToken.AxisTitleForeground]: 'currentColor',
  [PlotThemeToken.LegendTitleForeground]: 'currentColor',
  [PlotThemeToken.LegendLabelForeground]: 'currentColor',
};

describe('Plot theme monochrome paint', () => {
  it.each(Object.values(ThemeStyle))('%s 的文本与结构在两个 mode 下都继承 currentColor', style => {
    for (const mode of Object.values(ThemeMode)) {
      expect(getPlotThemePreset(style, mode)).toMatchObject(inheritedPaint);
    }
  });

  it.each([ThemeStyle.Neutral, ThemeStyle.Academic, ThemeStyle.Clean])(
    '%s 的 surface 在两个 mode 下都保持透明',
    style => {
      for (const mode of Object.values(ThemeMode)) {
        expect(getPlotThemePreset(style, mode)[PlotThemeToken.PlotAreaFill]).toBe('none');
      }
    },
  );

  it('Vibrant 使用与 mode 匹配的 tinted plot area', () => {
    expect(getPlotThemePreset(ThemeStyle.Vibrant, ThemeMode.Light)[PlotThemeToken.PlotAreaFill]).toBe('#E5ECF6');
    expect(getPlotThemePreset(ThemeStyle.Vibrant, ThemeMode.Dark)[PlotThemeToken.PlotAreaFill]).toBe('#111111');
  });

  it.each(Object.values(ThemeStyle))('%s 的基础 grid 在两个 mode 下默认关闭', style => {
    for (const mode of Object.values(ThemeMode)) {
      expect(getPlotThemePreset(style, mode)[PlotThemeToken.AxisGridEnabled]).toBe(false);
    }
  });

  it('Vibrant grid 使用与 plot area 对应的黑白分隔色', () => {
    expect(getPlotThemePreset(ThemeStyle.Vibrant, ThemeMode.Light)[PlotThemeToken.AxisGridStroke]).toBe('#FFFFFF');
    expect(getPlotThemePreset(ThemeStyle.Vibrant, ThemeMode.Dark)[PlotThemeToken.AxisGridStroke]).toBe('#000000');
  });

  it.each([ThemeStyle.Neutral, ThemeStyle.Academic, ThemeStyle.Clean])('%s grid 继承 currentColor', style => {
    for (const mode of Object.values(ThemeMode)) {
      expect(getPlotThemePreset(style, mode)[PlotThemeToken.AxisGridStroke]).toBe('currentColor');
    }
  });
});
