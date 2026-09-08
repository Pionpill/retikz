import type { CssColorValue, NonEmptyReadonlyArray, ThemeModeValue } from '@retikz/core';

import { resolveDefaultCoreThemeColors } from '@retikz/core';

import type { IRPlotDefaults } from '../../schemas';

import {
  getNeutralAxisDefaults,
  getNeutralLegendDefaults,
  getNeutralPaletteDefaults,
  getNeutralPlotAreaDefaults,
  getNeutralTypographyDefaults,
} from './preset';

/** 读取一个 mode-aware Neutral Plot defaults 片段 */
export const getNeutralPlotDefaults = (
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue> = resolveDefaultCoreThemeColors(mode).categorical,
): IRPlotDefaults =>
  structuredClone({
    plotArea: getNeutralPlotAreaDefaults(mode),
    typography: getNeutralTypographyDefaults(mode),
    axis: getNeutralAxisDefaults(mode),
    legend: getNeutralLegendDefaults(mode),
    palette: getNeutralPaletteDefaults(categorical),
  });
