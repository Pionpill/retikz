import type { ThemeModeValue } from '@retikz/core';

import type { IRPlotAreaDefaults } from '../../../schemas';

/** 读取 mode-aware Neutral Plot area defaults */
export const getNeutralPlotAreaDefaults = (mode: ThemeModeValue): IRPlotAreaDefaults => {
  void mode;
  return { fill: 'none' };
};
