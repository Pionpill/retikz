import type { BuiltinThemeStyleValue } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

import { PlotColorScheme } from '../../scale/shared';

type PalettePreset = Readonly<{
  sequential: string;
  diverging: string;
}>;

const presets: Record<BuiltinThemeStyleValue, PalettePreset> = {
  [ThemeStyle.Neutral]: {
    sequential: PlotColorScheme.Viridis,
    diverging: PlotColorScheme.RdBu,
  },
  [ThemeStyle.Academic]: {
    sequential: PlotColorScheme.Cividis,
    diverging: PlotColorScheme.RdBu,
  },
  [ThemeStyle.Vibrant]: {
    sequential: PlotColorScheme.Turbo,
    diverging: PlotColorScheme.Spectral,
  },
  [ThemeStyle.Clean]: {
    sequential: PlotColorScheme.Cividis,
    diverging: PlotColorScheme.RdBu,
  },
};

/** 读取内建主题的 sequential 与 diverging palette preset */
export const getPalettePreset = (style: BuiltinThemeStyleValue): PalettePreset => presets[style];
