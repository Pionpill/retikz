import type { CssColorValue, NonEmptyReadonlyArray } from '@retikz/core';

import type { IRPlotThemeTokenResolution } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';
import { PlotColorScheme } from '../../scale/shared';
import { PLOT_SHAPE_PALETTE } from '../shape-palette';

type PalettePresetSource = Readonly<{
  sequential: string;
  diverging: string;
}>;

type PaletteTokenPreset = Readonly<
  Pick<
    IRPlotThemeTokenResolution,
    | typeof PlotThemeToken.PlotPaletteCategorical
    | typeof PlotThemeToken.PlotPaletteSeries
    | typeof PlotThemeToken.PlotPaletteSector
    | typeof PlotThemeToken.PlotPaletteSequential
    | typeof PlotThemeToken.PlotPaletteDiverging
    | typeof PlotThemeToken.PlotPaletteShape
  >
>;

const defaultPreset: PalettePresetSource = {
  sequential: PlotColorScheme.Viridis,
  diverging: PlotColorScheme.RdBu,
};

/** 读取内建主题的 Plot palette token slice */
export const getPalettePreset = (categorical: NonEmptyReadonlyArray<CssColorValue>): PaletteTokenPreset => {
  const preset = defaultPreset;
  return {
    [PlotThemeToken.PlotPaletteCategorical]: [...categorical],
    [PlotThemeToken.PlotPaletteSeries]: [...categorical],
    [PlotThemeToken.PlotPaletteSector]: [...categorical],
    [PlotThemeToken.PlotPaletteSequential]: preset.sequential,
    [PlotThemeToken.PlotPaletteDiverging]: preset.diverging,
    [PlotThemeToken.PlotPaletteShape]: structuredClone(PLOT_SHAPE_PALETTE),
  };
};
