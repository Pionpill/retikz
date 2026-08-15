import type { ThemeModeValue } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IRPlotThemeTokenResolution } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';

type TypographyPresetSource = Readonly<{
  foreground: string;
  fontFamily: string;
  fontSize: number;
}>;

type TypographyStylePreset = Pick<TypographyPresetSource, 'fontFamily' | 'fontSize'>;
type TypographyModePreset = Pick<TypographyPresetSource, 'foreground'>;
type TypographyTokenPreset = Readonly<
  Pick<
    IRPlotThemeTokenResolution,
    | typeof PlotThemeToken.PlotTypographyForeground
    | typeof PlotThemeToken.PlotTypographyFontFamily
    | typeof PlotThemeToken.PlotTypographyFontSize
  >
>;

const defaultStructure: TypographyStylePreset = { fontFamily: 'sans-serif', fontSize: 12 };

const modes: Record<ThemeModeValue, TypographyModePreset> = {
  [ThemeMode.Light]: { foreground: 'currentColor' },
  [ThemeMode.Dark]: { foreground: 'currentColor' },
};

/** 读取内建主题的 Plot typography token slice */
export const getTypographyPreset = (mode: ThemeModeValue): TypographyTokenPreset => {
  const structure = defaultStructure;
  const paint = modes[mode];
  return {
    [PlotThemeToken.PlotTypographyForeground]: paint.foreground,
    [PlotThemeToken.PlotTypographyFontFamily]: structure.fontFamily,
    [PlotThemeToken.PlotTypographyFontSize]: structure.fontSize,
  };
};
