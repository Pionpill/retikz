import type { ThemeModeValue } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';

type PlotAreaTokenPreset = Readonly<Pick<IRPlotResolvedThemeTokens, typeof PlotThemeToken.PlotAreaFill>>;

const modes: Record<ThemeModeValue, IRPlotResolvedThemeTokens[typeof PlotThemeToken.PlotAreaFill]> = {
  [ThemeMode.Light]: 'none',
  [ThemeMode.Dark]: 'none',
};

/** 读取内建主题的 Plot area token slice */
export const getPlotAreaPreset = (mode: ThemeModeValue): PlotAreaTokenPreset => ({
  [PlotThemeToken.PlotAreaFill]: modes[mode],
});
