import type { ThemeModeValue } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';

type BackgroundTokenPreset = Readonly<Pick<IRPlotResolvedThemeTokens, typeof PlotThemeToken.PlotSurfaceFill>>;

const modes: Record<ThemeModeValue, IRPlotResolvedThemeTokens[typeof PlotThemeToken.PlotSurfaceFill]> = {
  [ThemeMode.Light]: 'none',
  [ThemeMode.Dark]: 'none',
};

/** 读取内建主题的 Plot background token slice */
export const getBackgroundPreset = (mode: ThemeModeValue): BackgroundTokenPreset => ({
  [PlotThemeToken.PlotSurfaceFill]: modes[mode],
});
