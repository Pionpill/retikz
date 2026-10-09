import type { CssColorValue, NonEmptyReadonlyArray } from '@retikz/core';

import type { IRPlotPaletteDefaults } from '../../../schemas';
import { BuiltinPlotColorScheme } from '../../../schemas';
import { PLOT_SHAPE_PALETTE } from '../shape-palette';

/** 读取 Neutral Plot palette defaults */
export const getNeutralPaletteDefaults = (
  categorical: NonEmptyReadonlyArray<CssColorValue>,
): IRPlotPaletteDefaults => ({
  categorical: [...categorical],
  series: [...categorical],
  sequential: BuiltinPlotColorScheme.Viridis,
  diverging: BuiltinPlotColorScheme.RdBu,
  shape: structuredClone(PLOT_SHAPE_PALETTE),
});
