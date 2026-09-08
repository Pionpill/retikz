import type { ThemeModeValue } from '@retikz/core';

import type { IRPlotAxisDefaults, IRPlotAxisRules } from '../../../schemas';

/** 读取 mode-aware Neutral Axis defaults */
export const getNeutralAxisDefaults = (mode: ThemeModeValue): IRPlotAxisDefaults => {
  void mode;
  return {
    line: { stroke: 'currentColor', strokeWidth: 1, drawOpacity: 1 },
    ticks: {
      mark: {
        kind: 'line',
        length: 6,
        line: { stroke: 'currentColor' },
      },
    },
    tickLabels: {
      gap: 4,
      font: { size: 12 },
      textColor: 'currentColor',
    },
    title: {
      padding: 12,
      font: { size: 12, weight: 600 },
      textColor: 'currentColor',
    },
    grid: false,
  };
};

/** 读取 Neutral Axis dimension rules */
export const getNeutralAxisRules = (): IRPlotAxisRules => [
  {
    select: { dimension: ['x', 'y'] },
    axis: {
      grid: {
        stroke: 'currentColor',
        strokeWidth: 1,
        drawOpacity: 0.15,
        includeDomain: true,
      },
    },
  },
];
