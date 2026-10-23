import type { IRChild } from '@retikz/core';

import type { InputChartPanel } from './types';

/**
 * 把 Chart 包装为可选的根 Scope
 */
export const wrapChartPanel = (chart: IRChild, panel: InputChartPanel | undefined): IRChild => {
  if (panel === undefined) return chart;

  const { position, transforms, zIndex, clip, theme } = panel;
  if (
    transforms === undefined &&
    position === undefined &&
    zIndex === undefined &&
    clip === undefined &&
    theme === undefined
  ) {
    return chart;
  }

  return {
    type: 'scope',
    ...(transforms === undefined ? {} : { transforms: [...transforms] }),
    ...(position === undefined ? {} : { position }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [chart],
  };
};
