import type { BuiltinThemeStyleValue, CssColorValue, NonEmptyReadonlyArray } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';
import { PlotColorScheme } from '../../scale/shared';
import { PLOT_SHAPE_PALETTE } from '../shape-palette';

type PalettePresetSource = Readonly<{
  sequential: string;
  diverging: string;
}>;

type PaletteTokenPreset = Readonly<
  Pick<
    IRPlotResolvedThemeTokens,
    | typeof PlotThemeToken.PlotPaletteCategorical
    | typeof PlotThemeToken.PlotPaletteSeries
    | typeof PlotThemeToken.PlotPaletteSector
    | typeof PlotThemeToken.PlotPaletteSequential
    | typeof PlotThemeToken.PlotPaletteDiverging
    | typeof PlotThemeToken.PlotPaletteShape
  >
>;

const presets: Record<BuiltinThemeStyleValue, PalettePresetSource> = {
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

/** 读取内建主题的 Plot palette token slice */
export const getPalettePreset = (
  style: BuiltinThemeStyleValue,
  categorical: NonEmptyReadonlyArray<CssColorValue>,
): PaletteTokenPreset => {
  const preset = presets[style];
  return {
    [PlotThemeToken.PlotPaletteCategorical]: [...categorical],
    [PlotThemeToken.PlotPaletteSeries]: [...categorical],
    [PlotThemeToken.PlotPaletteSector]: [...categorical],
    [PlotThemeToken.PlotPaletteSequential]: preset.sequential,
    [PlotThemeToken.PlotPaletteDiverging]: preset.diverging,
    [PlotThemeToken.PlotPaletteShape]: structuredClone(PLOT_SHAPE_PALETTE),
  };
};
