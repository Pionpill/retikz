import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../../schemas';

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
    IRPlotResolvedThemeTokens,
    | typeof PlotThemeToken.PlotTypographyForeground
    | typeof PlotThemeToken.PlotTypographyFontFamily
    | typeof PlotThemeToken.PlotTypographyFontSize
  >
>;

const styles: Record<BuiltinThemeStyleValue, TypographyStylePreset> = {
  [ThemeStyle.Neutral]: { fontFamily: 'sans-serif', fontSize: 12 },
  [ThemeStyle.Academic]: { fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontSize: 12 },
  [ThemeStyle.Vibrant]: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: 13 },
  [ThemeStyle.Clean]: { fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontSize: 12 },
};

const modes: Record<ThemeModeValue, TypographyModePreset> = {
  [ThemeMode.Light]: { foreground: 'currentColor' },
  [ThemeMode.Dark]: { foreground: 'currentColor' },
};

/** 读取内建主题的 Plot typography token slice */
export const getTypographyPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): TypographyTokenPreset => {
  const structure = styles[style];
  const paint = modes[mode];
  return {
    [PlotThemeToken.PlotTypographyForeground]: paint.foreground,
    [PlotThemeToken.PlotTypographyFontFamily]: structure.fontFamily,
    [PlotThemeToken.PlotTypographyFontSize]: structure.fontSize,
  };
};
