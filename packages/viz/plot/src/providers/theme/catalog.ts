import type { BuiltinThemeStyleValue, CssColorValue, NonEmptyReadonlyArray, ThemeModeValue } from '@retikz/core';

import { resolveCoreThemeColors } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

import { PlotResolvedThemeTokensSchema } from '../../schemas';
import { getAxisPreset, getBackgroundPreset, getLegendPreset, getPalettePreset, getTypographyPreset } from './preset';

const createPreset = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue>,
): IRPlotResolvedThemeTokens => {
  return PlotResolvedThemeTokensSchema.parse({
    ...getBackgroundPreset(mode),
    ...getTypographyPreset(style, mode),
    ...getAxisPreset(style, mode),
    ...getLegendPreset(style, mode),
    ...getPalettePreset(style, categorical),
  });
};

/** 读取一个内建 Plot style/mode 的完整 token map */
export const getPlotThemePreset = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue> = resolveCoreThemeColors(style, mode).categorical,
): IRPlotResolvedThemeTokens => structuredClone(createPreset(style, mode, categorical));
