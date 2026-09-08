import type { ThemeModeValue } from '@retikz/core';

import type { IRPlotDefaults } from '../../../schemas';

import { LegendSymbolFit } from '../../../schemas';

/** 读取 mode-aware Neutral Legend defaults */
export const getNeutralLegendDefaults = (mode: ThemeModeValue): NonNullable<IRPlotDefaults['legend']> => {
  void mode;
  return {
    title: {
      font: { size: 12, weight: 600 },
      textColor: 'currentColor',
    },
    label: {
      font: { size: 12 },
      textColor: 'currentColor',
    },
    swatchSize: 14,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 100,
    rampThickness: 12,
    symbolSize: 14,
    symbolScale: 1,
    symbolFit: LegendSymbolFit.Fit,
  };
};
