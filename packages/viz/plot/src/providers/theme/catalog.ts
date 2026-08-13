import type { CssColorValue, NonEmptyReadonlyArray, ThemeModeValue } from '@retikz/core';

import { resolveDefaultCoreThemeColors } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

import { PlotResolvedThemeTokensSchema } from '../../schemas';
import { getAxisPreset, getLegendPreset, getPalettePreset, getPlotAreaPreset, getTypographyPreset } from './preset';

const createPreset = (
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue>,
): IRPlotResolvedThemeTokens => {
  return PlotResolvedThemeTokensSchema.parse({
    ...getPlotAreaPreset(mode),
    ...getTypographyPreset(mode),
    ...getAxisPreset(mode),
    ...getLegendPreset(mode),
    ...getPalettePreset(categorical),
  });
};

/** 读取一个内建 Plot style/mode 的完整 token map */
export const getDefaultPlotThemePreset = (
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue> = resolveDefaultCoreThemeColors(mode).categorical,
): IRPlotResolvedThemeTokens => structuredClone(createPreset(mode, categorical));
