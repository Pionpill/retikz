import type { ThemeMode } from '@retikz/core';

import type { IRPlotTypographyDefaults } from '../../../schemas';

/** 读取 mode-aware Neutral Plot typography defaults */
export const getNeutralTypographyDefaults = (mode: ThemeMode): IRPlotTypographyDefaults => {
  void mode;
  return {
    font: { family: 'sans-serif', size: 12 },
    textColor: 'currentColor',
  };
};
