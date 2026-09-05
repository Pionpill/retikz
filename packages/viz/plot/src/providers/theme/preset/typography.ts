import type { ThemeModeValue } from '@retikz/core';

import type { IRPlotTypographyDefaults } from '../../../schemas';

/** 读取 mode-aware Neutral Plot typography defaults */
export const getNeutralTypographyDefaults = (mode: ThemeModeValue): IRPlotTypographyDefaults => {
  void mode;
  return {
    font: { family: 'sans-serif', size: 12 },
    textColor: 'currentColor',
  };
};
