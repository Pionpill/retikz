import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

type PlotPreset = Readonly<{
  surface: string;
  foreground: string;
  fontFamily: string;
  fontSize: number;
}>;

type PlotStylePreset = Pick<PlotPreset, 'fontFamily' | 'fontSize'>;
type PlotModePreset = Pick<PlotPreset, 'surface' | 'foreground'>;

const styles: Record<BuiltinThemeStyleValue, PlotStylePreset> = {
  [ThemeStyle.Neutral]: {
    fontFamily: 'sans-serif',
    fontSize: 12,
  },
  [ThemeStyle.Academic]: {
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    fontSize: 12,
  },
  [ThemeStyle.Vibrant]: {
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    fontSize: 13,
  },
  [ThemeStyle.Clean]: {
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    fontSize: 12,
  },
};

const modes: Record<ThemeModeValue, PlotModePreset> = {
  [ThemeMode.Light]: {
    surface: 'none',
    foreground: 'currentColor',
  },
  [ThemeMode.Dark]: {
    surface: 'none',
    foreground: 'currentColor',
  },
};

/** 读取内建主题的 Plot surface 与 typography preset */
export const getPlotPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): PlotPreset => ({
  ...styles[style],
  ...modes[mode],
});
