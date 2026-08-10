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

  it('Vibrant grid 使用 mode 背景色并保持不透明', () => {
    const light = getPlotThemePreset(ThemeStyle.Vibrant, ThemeMode.Light);
    const dark = getPlotThemePreset(ThemeStyle.Vibrant, ThemeMode.Dark);

    expect(light[PlotThemeToken.AxisGridStroke]).toBe('#FFFFFF');
    expect(dark[PlotThemeToken.AxisGridStroke]).toBe('#000000');
    expect(light[PlotThemeToken.AxisGridDrawOpacity]).toBe(1);
    expect(dark[PlotThemeToken.AxisGridDrawOpacity]).toBe(1);
  });

  it.each([ThemeStyle.Neutral, ThemeStyle.Academic, ThemeStyle.Clean])('%s grid 继承 currentColor', style => {
    for (const mode of Object.values(ThemeMode)) {
      const preset = getPlotThemePreset(style, mode);

      expect(preset[PlotThemeToken.AxisGridStroke]).toBe('currentColor');
      expect(preset[PlotThemeToken.AxisGridDrawOpacity]).toBe(0.15);
    }
  });
});
