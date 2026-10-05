import type { ThemeMode } from '@retikz/core';

import type { IRPlotAreaDefaults } from '../../../schemas';

/** 读取 mode-aware Neutral Plot area defaults */
export const getNeutralPlotAreaDefaults = (mode: ThemeMode): IRPlotAreaDefaults => {
  void mode;
  return { fill: 'none' };
};
