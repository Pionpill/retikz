import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';

type PlotAreaTokenPreset = Readonly<Pick<IRPlotResolvedThemeTokens, typeof PlotThemeToken.PlotAreaFill>>;

type PlotAreaFill = IRPlotResolvedThemeTokens[typeof PlotThemeToken.PlotAreaFill];

const transparentModes: Record<ThemeModeValue, PlotAreaFill> = {
  [ThemeMode.Light]: 'none',
  [ThemeMode.Dark]: 'none',
};

const styles: Record<BuiltinThemeStyleValue, Record<ThemeModeValue, PlotAreaFill>> = {
  [ThemeStyle.Neutral]: transparentModes,
};

/** 读取内建主题的 Plot area token slice */
export const getPlotAreaPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): PlotAreaTokenPreset => ({
  [PlotThemeToken.PlotAreaFill]: styles[style][mode],
});
